const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();
const {expect} = chai;

const {DidDocument} = require('../src/DidDocument');
const constants = require('../src/constants');

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
        keys: {
          capabilityInvocation: false,
          authentication: false,
          assertionMethod: false,
          capabilityDelegation: false,
          keyAgreement: false
        }
      });

      expect(didKeys).to.eql({});
      expect(JSON.stringify(didDocument)).to.equal('{"id":"did:ex:1234"}');
    });

    it('initializes using existing keys if given', async () => {
      const mockExistingKey = {
        id: 'did:ex:123#fingerprint',
        publicNode: () => {}
      };
      const {didKeys} = await didDocument.initKeys({
        keys: {
          capabilityInvocation: mockExistingKey,
          authentication: false,
          assertionMethod: false,
          capabilityDelegation: false,
          keyAgreement: false
        }
      });

      expect(didKeys['did:ex:123#fingerprint']).to.eql(mockExistingKey);
    });

    it('generates keys of default type if not given or excluded', async () => {
      const {didKeys} = await didDocument.initKeys();
      const did = 'did:ex:1234';

      for(const keyId in didKeys) {
        expect(keyId).to.match(/^did\:ex\:1234#z/);
        expect(didKeys[keyId].controller).to.equal(did);
        expect(didKeys[keyId]).to.have.property('privateKeyBase58');
      }

      const defaultPurposes = [
        'capabilityInvocation',
        'authentication',
        'assertionMethod',
        'capabilityDelegation'
      ];
      for(const purpose of defaultPurposes) {
        const publicKey = didDocument[purpose][0];
        expect(publicKey.id).to.match(/^did\:ex\:1234#z/);
        expect(publicKey.type).to.equal(constants.DEFAULT_KEY_TYPE);
        expect(publicKey.controller).to.equal(did);
        expect(publicKey).to.have.property('publicKeyBase58');
        expect(publicKey).to.not.have.property('privateKeyBase58');
      }
      const keyAgreementKey = didDocument.keyAgreement[0];
      expect(keyAgreementKey.id).to.match(/^did\:ex\:1234#z/);
      expect(keyAgreementKey.type).to.equal('X25519KeyAgreementKey2019');
      expect(keyAgreementKey).to.have.property('publicKeyBase58');
      expect(keyAgreementKey).to.not.have.property('privateKeyBase58');
    });
  });
});
