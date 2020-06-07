const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();
const {expect} = chai;

const {DidDocument} = require('../src/DidDocument');
// const constants = require('../src/constants');

const {CryptoLD} = require('crypto-ld');
const ed25519 = require('ed25519-key-pair');

const cryptoLd = new CryptoLD();
cryptoLd.use(ed25519); // ed25519 type

describe('DidDocument', () => {
  describe('constructor', () => {
    it('does not init endpoints or proof methods by default', () => {
      const didDocument = new DidDocument({id: 'did:ex:1234'});

      expect(JSON.stringify(didDocument)).to.equal('{"id":"did:ex:1234"}');
    });
  });

  describe('initKeys', () => {
    let didDocument;

    beforeEach(() => {
      didDocument = new DidDocument({id: 'did:ex:1234'});
    });

    it('throws error if id is not set', async () => {
      didDocument.id = undefined;
      let error;
      try {
        await didDocument.initKeys();
      } catch(e) {
        error = e;
      }
      expect(error.message)
        .to.equal('DID Document "id" property is required to initialize keys.');
    });

    it('does not initialize excluded keys', async () => {
      const {didKeys} = await didDocument.initKeys({
        cryptoLd: {},
        keyMap: {}
      });

      expect(didKeys).to.eql({});
      expect(JSON.stringify(didDocument)).to.equal('{"id":"did:ex:1234"}');
    });

    it('initializes using existing keys if given', async () => {
      const mockExistingKey = {
        id: 'did:ex:123#fingerprint',
        export: () => {}
      };
      const {didKeys} = await didDocument.initKeys({
        cryptoLd,
        keyMap: {
          capabilityInvocation: mockExistingKey
        }
      });

      expect(didKeys['did:ex:123#fingerprint']).to.eql(mockExistingKey);
    });

    it('generates keys of specified type', async () => {
      const keyMap = {
        capabilityInvocation: 'ed25519',
        authentication: 'ed25519'
      };
      const {didKeys} = await didDocument.initKeys({keyMap, cryptoLd});
      const did = 'did:ex:1234';

      for(const keyId in didKeys) {
        expect(keyId).to.match(/^did\:ex\:1234#z/);
        expect(didKeys[keyId].controller).to.equal(did);
        expect(didKeys[keyId]).to.have.property('privateKeyBase58');
      }

      const purposes = [
        'capabilityInvocation',
        'authentication'
      ];
      for(const purpose of purposes) {
        const publicKey = didDocument[purpose][0];
        expect(publicKey.id).to.match(/^did\:ex\:1234#z/);
        expect(publicKey.type).to.equal('Ed25519VerificationKey2018');
        expect(publicKey.controller).to.equal(did);
        expect(publicKey).to.have.property('publicKeyBase58');
        expect(publicKey).to.not.have.property('privateKeyBase58');
      }
      // const keyAgreementKey = didDocument.keyAgreement[0];
      // expect(keyAgreementKey.id).to.match(/^did\:ex\:1234#z/);
      // expect(keyAgreementKey.type).to.equal('X25519KeyAgreementKey2019');
      // expect(keyAgreementKey).to.have.property('publicKeyBase58');
      // expect(keyAgreementKey).to.not.have.property('privateKeyBase58');
    });
  });
});
