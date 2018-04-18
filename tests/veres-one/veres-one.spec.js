const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const dids = require('../../lib/index');
const jsonld = require('jsonld')();
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', jsonld);

describe('methods/veres-one', () => {
  let v1;

  before(() => {
    dids.use('jsonld', jsonld);
    dids.use('jsonld-signatures', jsigs);
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
  });

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
