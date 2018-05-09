const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const dids = require('../../lib/index');
const VeresOne = require('../../lib/methods/veres-one/veres-one');

describe('methods/veres-one', () => {
  let v1;

  before(() => {
    v1 = dids.methods.veres();
    // FIXME: determine how to simplify/move this code out of test
    const jsonld = v1.injector.use('jsonld');
    const documentLoader = jsonld.documentLoader;

    jsonld.documentLoader = async url => {
      if(url in VeresOne.contexts) {
        return {
          contextUrl: null,
          documentUrl: url,
          document: VeresOne.contexts[url]
        };
      }
      return documentLoader(url);
    };
    v1.injector.use('jsonld', jsonld);
    const jsigs = require('jsonld-signatures');
    jsigs.use('jsonld', jsonld);
    const eproofs = require('equihash-signature');
    eproofs.install(jsigs);
    v1.injector.use('jsonld-signatures', jsigs);
  });

  describe('generate', () => {
    it('should generate protected RSA nym-based DID Document', async () => {
      const nymOptions = {
        passphrase: 'foobar',
        keyType: 'RsaVerificationKey2018'
      };
      const didDocument = await v1.generate(nymOptions);
      expect(didDocument.id)
        .to.match(/^did\:v1\:test\:nym\:.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      const publicKeyPem = authPublicKey.publicKeyPem;
      expect(publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');

      const keyPair = await didDocument.keys[authPublicKey.id].export();
      // check the corresponding private key
      expect(keyPair.secretKeyPem)
        .to.have.string('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    }).timeout(30000);

    it('should generate protected EDD nym-based DID Document', async () => {
      const nymOptions = {passphrase: 'foobar'};
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.id)
        .to.match(/^did\:v1\:test\:nym\:.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      const publicKeyBase58 = authPublicKey.publicKeyBase58;
      expect(publicKeyBase58).to.exist();

      const exportedKey = await didDocument.keys[authPublicKey.id].export();

      // check the corresponding private key
      expect(exportedKey.secretKeyJwe.unprotected.alg)
        .to.equal('PBES2-A128GCMKW');

      // check that keys have been saved in key store
      const savedKeys = await v1.keys.get(didDocument.id);
      expect(Object.keys(savedKeys).length).to.equal(3);
    }).timeout(30000);

    it('should generate unprotected RSA nym-based DID Document', async () => {
      const nymOptions = {
        passphrase: null,
        keyType: 'RsaVerificationKey2018'
      };
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.id).to.match(/^did\:v1\:test\:nym\:.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      expect(authPublicKey.publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      const keyPair = await didDocument.keys[authPublicKey.id].export();
      // check the corresponding private key
      expect(keyPair.secretKeyPem)
        .to.have.string('-----BEGIN RSA PRIVATE KEY-----');

    }).timeout(30000);

    it('should generate unprotected EDD nym-based DID Document', async () => {
      const nymOptions = {passphrase: null};
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.id).to.match(/^did\:v1\:test\:nym\:.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      expect(authPublicKey.publicKeyBase58).to.exist();

      const exportedKey = await didDocument.keys[authPublicKey.id].export();
      expect(exportedKey.secretKeyBase58).to.exist();
    }).timeout(30000);

    it('should generate uuid-based DID Document', async () => {
      const uuidOptions = {
        didType: 'uuid',
        keyType: 'RsaVerificationKey2018'
      };
      const didDocument = await v1.generate(uuidOptions);

      expect(didDocument.id).to.match(
        /^did\:v1\:test\:uuid\:.*/);
    });
  });

  describe.skip('register', () => {
    it('should send a doc to ledger for registration', async () => {
      const didDocument = await v1.generate({
        passphrase: null //, keyType: 'RsaVerificationKey2018'
      });
      const result = await v1.register({didDocument, authDoc: didDocument, accelerator: 'genesis.testnet.veres.one'});

      // const result = await v1.get('did:v1:test:nym:F8fKsFHrPyAZKeC3bkPdg8HsPtqA5uepQdXrH62Ccf7E');

      console.log(result);

      console.log(JSON.stringify(await result.text(), 0, 2));
    });
  });

  describe('wrap', () => {
    it('should wrap a nym-based DID Document in an operation', async () => {
      const didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      const operation = v1.wrap({didDocument});
      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:nym\:.*/);
      expect(operation.record.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
    }).timeout(30000);

    it('should wrap a uuid-based DID Document in an operation', async () => {
      const didDocument = await v1.generate({didType: 'uuid'});
      const operation = v1.wrap({didDocument});
      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:uuid\:.*/);
    });
  });

  describe('attachGrantProof', () => {
    it('should attach an ld-ocap grant proof to an operation', async () => {
      let didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      const grantPublicKey = didDocument.doc.grantCapability[0].publicKey[0];
      const creator = grantPublicKey.id;
      const {secretKeyPem} = await didDocument.keys[grantPublicKey.id].export();

      didDocument = await v1.attachGrantProof({
        didDocument,
        creator,
        privateKeyPem: secretKeyPem
      });

      expect(didDocument.proof).to.exist();
      expect(didDocument.proof.type).to.equal('RsaSignature2018');
      expect(didDocument.proof.proofPurpose).to.equal('grantCapability');
      expect(didDocument.proof.creator).to.equal(creator);
      expect(didDocument.proof.jws).to.exist();
    }).timeout(30000);
  });

  describe('attachInvocationProof', () => {
    it('should attach an ld-ocap invocation proof to an operation', async () => {
      const didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      let operation = v1.wrap({didDocument});
      const invokePublicKey = didDocument.doc.invokeCapability[0].publicKey[0];
      const creator = invokePublicKey.id;

      const {secretKeyPem} = await didDocument.keys[invokePublicKey.id].export();

      operation = await v1.attachInvocationProof({
        operation,
        capability: didDocument.id,
        capabilityAction: operation.type,
        creator,
        privateKeyPem: secretKeyPem
      });

      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:nym\:.*/);
      expect(operation.record.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      expect(operation.proof).to.exist();
      expect(operation.proof.type).to.equal('RsaSignature2018');
      expect(operation.proof.capabilityAction).to.equal(operation.type);
      expect(operation.proof.proofPurpose).to.equal('invokeCapability');
      expect(operation.proof.creator).to.equal(creator);
      expect(operation.proof.jws).to.exist();
    }).timeout(30000);
  });

  describe('attachEquihashProof', () => {
    it('should attach an equihash proof to an operation', async () => {
      // generate a DID Document
      const didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      // attach an capability invocation proof
      let operation = v1.wrap({didDocument});
      const invokePublicKey = didDocument.doc.invokeCapability[0].publicKey[0];
      const creator = invokePublicKey.id;
      const {secretKeyPem} = await didDocument.keys[invokePublicKey.id].export();

      operation = await v1.attachInvocationProof({
        operation,
        capability: didDocument.id,
        capabilityAction: operation.type,
        creator,
        privateKeyPem: secretKeyPem
      });

      // attach an equihash proof
      operation = await v1.attachEquihashProof({operation});

      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:nym\:.*/);
      expect(operation.record.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      expect(operation.proof).to.exist();
      // capability invocation proof
      expect(operation.proof).to.exist();
      expect(operation.proof[0]).to.exist();
      expect(operation.proof[0].type).to.equal('RsaSignature2018');
      expect(operation.proof[0].capabilityAction).to.equal(operation.type);
      expect(operation.proof[0].proofPurpose).to.equal('invokeCapability');
      expect(operation.proof[0].creator).to.equal(creator);
      expect(operation.proof[0].jws).to.exist();
      // equihash proof
      expect(operation.proof[1]).to.exist();
      expect(operation.proof[1].type).to.equal('EquihashProof2018');
      expect(operation.proof[1].equihashParameterN).to.exist();
      expect(operation.proof[1].equihashParameterK).to.exist();
      expect(operation.proof[1].nonce).to.exist();
      expect(operation.proof[1].proofValue).to.exist();
    }).timeout(30000);
  });
});
