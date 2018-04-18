const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const dids = require('../../lib/index');
const VeresOne = require('../../lib/methods/veres-one/veres-one');

// FIXME: determine how to simplify/move this code out of test
const jsonld = dids.use('jsonld');
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
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', jsonld);
const eproofs = require('equihash-signature');
eproofs.install(jsigs);
dids.use('jsonld-signatures', jsigs);

describe('methods/veres-one', () => {
  let v1;

  before(() => {
    v1 = dids.methods.veres();
  });

  describe('generate', () => {
    it('should generate protected nym-based DID Document', async () => {
      const nymOptions = {
        passphrase: 'foobar'
      };
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.publicDidDocument.id)
        .to.match(/^did\:v1\:test\:nym\:.*/);
      const publicKeyPem = didDocument.publicDidDocument.authentication[0]
        .publicKey[0].publicKeyPem;
      expect(publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      expect(
        didDocument.privateDidDocument.authentication[0].publicKey[0]
          .privateKey.privateKeyPem)
        .to.have.string('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    }).timeout(30000);

    it('should generate unprotected nym-based DID Document', async () => {
      const nymOptions = {
        passphrase: null
      };
      const didDocument = await v1.generate(nymOptions);

      expect(didDocument.publicDidDocument.id).to.match(
        /^did\:v1\:test\:nym\:.*/);
      expect(
        didDocument.publicDidDocument.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
      expect(
        didDocument.privateDidDocument.authentication[0].publicKey[0]
          .privateKey.privateKeyPem)
        .to.have.string('-----BEGIN RSA PRIVATE KEY-----');
    }).timeout(30000);

    it('should generate uuid-based DID Document', async () => {
      const uuidOptions = {
        didType: 'uuid'
      };
      const didDocument = await v1.generate(uuidOptions);

      expect(didDocument.publicDidDocument.id).to.match(
        /^did\:v1\:test\:uuid\:.*/);
    });
  });

  describe('wrap', () => {
    it('should wrap a nym-based DID Document in an operation', async () => {
      const {publicDidDocument: didDocument} = await v1.generate(
        {passphrase: null});

      const operation = v1.wrap({didDocument});
      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:nym\:.*/);
      expect(operation.record.authentication[0].publicKey[0].publicKeyPem)
        .to.have.string('-----BEGIN PUBLIC KEY-----');
    }).timeout(30000);

    it('should wrap a uuid-based DID Document in an operation', async () => {
      const {publicDidDocument: didDocument} = await v1.generate(
        {didType: 'uuid'});
      const operation = v1.wrap({didDocument});
      expect(operation.type).to.equal('CreateWebLedgerRecord');
      expect(operation.record.id).to.match(/^did\:v1\:test\:uuid\:.*/);
    });
  });

  describe('attachGrantProof', () => {
    it('should attach an ld-ocap grant proof to an operation', async () => {
      let {publicDidDocument: didDocument, privateDidDocument} =
        await v1.generate({passphrase: null});

      const creator = didDocument.grantCapability[0].publicKey[0].id;
      const privateKeyPem = privateDidDocument.grantCapability[0].publicKey[0]
        .privateKey.privateKeyPem;

      didDocument = await v1.attachGrantProof({
        didDocument,
        creator,
        privateKeyPem
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
      const {publicDidDocument: didDocument, privateDidDocument} =
        await v1.generate({passphrase: null});

      let operation = v1.wrap({didDocument});
      const creator = didDocument.invokeCapability[0].publicKey[0].id;
      const privateKeyPem = privateDidDocument.invokeCapability[0].publicKey[0]
        .privateKey.privateKeyPem;

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
      expect(operation.proof.proofPurpose).to.equal('invokeCapability');
      expect(operation.proof.creator).to.equal(creator);
      expect(operation.proof.jws).to.exist();
    }).timeout(30000);
  });

  describe('attachEquihashProof', () => {
    it('should attach an equihash proof to an operation', async () => {
      // generate a DID Document
      const {publicDidDocument: didDocument, privateDidDocument} =
        await v1.generate({passphrase: null});

      // attach an capability invocation proof
      let operation = v1.wrap({didDocument});
      const creator = didDocument.invokeCapability[0].publicKey[0].id;
      const privateKeyPem = privateDidDocument.invokeCapability[0].publicKey[0]
        .privateKey.privateKeyPem;

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
