const nock = require('nock');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;
const Store = require('flex-docstore');

const dids = require('../../lib/index');
const VeresOne = require('../../lib/methods/veres-one/veres-one');

const TEST_DID = 'did:v1:test:nym:2pfPix2tcwa7gNoMRxdcHbEyFGqaVBPNntCsDZexVeHX';
const TEST_DID_RESULT = require('../dids/genesis.testnet.did.json');
const LEDGER_AGENTS_DOC = require('../dids/ledger-agents.json');

describe('methods/veres-one', () => {
  let v1;

  beforeEach(() => {
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

    v1.keyStore = Store.using('mock');
    v1.didStore = Store.using('mock');
    v1.metaStore = Store.using('mock');
  });

  describe('get', () => {
    it('should fetch a DID Doc from a ledger', async () => {
      nock('https://genesis.testnet.veres.one')
        .get(`/ledger-agents`)
        .reply(200, LEDGER_AGENTS_DOC);

      nock('https://genesis.testnet.veres.one')
        .post('/ledger-agents/72fdcd6a-5861-4307-ba3d-cbb72509533c' +
          '/query?id=' + TEST_DID)
        .reply(200, TEST_DID_RESULT);

      const didDoc = await v1.get({did: TEST_DID});
      expect(didDoc.id).to.equal(TEST_DID);
    });

    it('should fetch a pairwise DID from local DID storage', async () => {
      await v1.didStore.put(TEST_DID, TEST_DID_RESULT.record);

      nock('https://genesis.testnet.veres.one')
        .get(`/ledger-agents`)
        .reply(200, LEDGER_AGENTS_DOC);

      nock('https://genesis.testnet.veres.one')
        .post('/ledger-agents/72fdcd6a-5861-4307-ba3d-cbb72509533c' +
          '/query?id=' + TEST_DID)
        .reply(404, {});

      const didDoc = await v1.get({did: TEST_DID});
      expect(didDoc.id).to.equal(TEST_DID);
    });

    it('should throw a 404 if DID not found on ledger or locally', done => {
      nock('https://genesis.testnet.veres.one')
        .get(`/ledger-agents`)
        .reply(200, LEDGER_AGENTS_DOC);

      nock('https://genesis.testnet.veres.one')
        .post('/ledger-agents/72fdcd6a-5861-4307-ba3d-cbb72509533c' +
          '/query?id=' + TEST_DID)
        .reply(404, {});

      v1.get({did: TEST_DID})
        .catch(error => {
          expect(error.response.status).to.equal(404);
          done();
        });
    });
  });

  describe('generate', () => {
    it('should generate protected RSA nym-based DID Document', async () => {
      const nymOptions = {
        passphrase: 'foobar',
        keyType: 'RsaVerificationKey2018'
      };
      const didDocument = await v1.generate(nymOptions);
      expect(didDocument.id)
        .to.match(/^did\:v1\:test\:nym\:z.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      const publicKeyPem = authPublicKey.publicKeyPem;
      expect(publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');

      const keyPair = await didDocument.keys[authPublicKey.id].export();
      // check the corresponding private key
      expect(keyPair.privateKeyPem)
        .to.have.string('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    }).timeout(30000);

    it('should generate protected EDD nym-based DID Document', async () => {
      const nymOptions = {passphrase: 'foobar'};
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.id)
        .to.match(/^did\:v1\:test\:nym\:z.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      const publicKeyBase58 = authPublicKey.publicKeyBase58;
      expect(publicKeyBase58).to.exist();

      const exportedKey = await didDocument.keys[authPublicKey.id].export();

      // check the corresponding private key
      expect(exportedKey.privateKeyJwe.unprotected.alg)
        .to.equal('PBES2-A128GCMKW');

      // check that keys have been saved in key store
      const savedKeys = await v1.keyStore.get(didDocument.id);
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
      expect(keyPair.privateKeyPem)
        .to.have.string('-----BEGIN RSA PRIVATE KEY-----');

    }).timeout(30000);

    it('should generate unprotected EDD nym-based DID Document', async () => {
      const nymOptions = {passphrase: null};
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.id).to.match(/^did\:v1\:test\:nym\:.*/);
      const authPublicKey = didDocument.doc.authentication[0].publicKey[0];
      expect(authPublicKey.publicKeyBase58).to.exist();

      const exportedKey = await didDocument.keys[authPublicKey.id].export();
      expect(exportedKey.privateKeyBase58).to.exist();
    }).timeout(30000);

    it('should generate uuid-based DID Document', async () => {
      const uuidOptions = {
        didType: 'uuid',
        keyType: 'RsaVerificationKey2018'
      };
      const didDocument = await v1.generate(uuidOptions);

      expect(didDocument.id).to.match(/^did\:v1\:test\:uuid\:.*/);
    });

    it('should generate protected ed25519 nym-based DID Doc', async () => {
      const nymOptions = {
        keyType: 'Ed25519VerificationKey2018',
        passphrase: 'foobar'
      };
      const didDocument = await v1.generate(nymOptions);
      const did = didDocument.id;

      expect(did).to.match(/^did\:v1\:test\:nym\:z.*/);
      const fingerprint = did.replace('did:v1:test:nym:z', '');

      const invokePublicKey = didDocument.doc.capabilityInvocation[0].publicKey[0];

      expect(invokePublicKey.id).to.have.string('nym:z');

      const invokeKey = didDocument.keys[invokePublicKey.id];
      const exportedKey = await invokeKey.export();

      expect(exportedKey.privateKeyJwe.ciphertext)
        .to.have.lengthOf.above(128);

      expect(invokeKey.verifyFingerprint(fingerprint)).to.be.true();
    }).timeout(30000);

    it('should generate unprotected ed25519 nym-based DID Doc', async () => {
      const nymOptions = {
        keyType: 'Ed25519VerificationKey2018',
        passphrase: null
      };
      const didDocument = await v1.generate(nymOptions);
      const did = didDocument.id;

      expect(did).to.match(/^did\:v1\:test\:nym\:z.*/);
      const fingerprint = did.replace('did:v1:test:nym:z', '');

      const invokePublicKey = didDocument.doc.capabilityInvocation[0].publicKey[0];
      const invokeKey = didDocument.keys[invokePublicKey.id];

      expect(invokePublicKey.id).to.have.string('nym:z');

      expect(invokeKey.verifyFingerprint(fingerprint)).to.be.true();
    }).timeout(30000);
  });

  describe.skip('register', () => {
    it('should send a doc to ledger for registration', async () => {
      const didDocument = await v1.generate({
        passphrase: null //, keyType: 'RsaVerificationKey2018'
      });
      const result = await v1.register({
        didDocument,
        authDoc: didDocument,
        accelerator: 'genesis.testnet.veres.one'
      });

      // const result = await v1.get({
      //   did: 'did:v1:test:nym:CS69oXskYadUi2MPjSvQguhUgeaxzdA4ZSQRzniNf1t5',
      //   mode: 'test'
      // });
      // console.log(result);

      console.log(JSON.stringify(await result.text(), null, 2));
    });
  });

  describe('attachDelegationProof', () => {
    it('should attach an ocap-ld delegation proof to an operation', async () => {
      let didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      const delegationPublicKey = didDocument.doc.capabilityDelegation[0].publicKey[0];
      const creator = delegationPublicKey.id;
      const {privateKeyPem} = await didDocument.keys[delegationPublicKey.id].export();

      didDocument = await v1.attachDelegationProof({
        didDocument,
        creator,
        privateKeyPem
      });

      expect(didDocument.proof).to.exist();
      expect(didDocument.proof.type).to.equal('RsaSignature2018');
      expect(didDocument.proof.proofPurpose).to.equal('capabilityDelegation');
      expect(didDocument.proof.creator).to.equal(creator);
      expect(didDocument.proof.jws).to.exist();
    }).timeout(30000);
  });

  describe('attachInvocationProof', () => {
    it('should attach an ld-ocap invocation proof to an operation', async () => {
      const didDocument = await v1.generate({
        passphrase: null, keyType: 'RsaVerificationKey2018'
      });

      let operation = v1.client.wrap({didDocument: didDocument.doc});
      const invokePublicKey = didDocument.doc.capabilityInvocation[0].publicKey[0];
      const creator = invokePublicKey.id;

      const {privateKeyPem} = await didDocument.keys[invokePublicKey.id].export();

      operation = await v1.attachInvocationProof({
        operation,
        capability: didDocument.id,
        capabilityAction: operation.type,
        creator,
        privateKeyPem
      });

      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:nym\:.*/);
      expect(operation.record.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      expect(operation.proof).to.exist();
      expect(operation.proof.type).to.equal('RsaSignature2018');
      expect(operation.proof.capabilityAction).to.equal(operation.type);
      expect(operation.proof.proofPurpose).to.equal('capabilityInvocation');
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
      let operation = v1.client.wrap({didDocument: didDocument.doc});
      const invokePublicKey = didDocument.doc.capabilityInvocation[0].publicKey[0];
      const creator = invokePublicKey.id;
      const {privateKeyPem} = await didDocument.keys[invokePublicKey.id].export();

      operation = await v1.attachInvocationProof({
        operation,
        capability: didDocument.id,
        capabilityAction: operation.type,
        creator,
        privateKeyPem
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
      expect(operation.proof[0].proofPurpose).to.equal('capabilityInvocation');
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
