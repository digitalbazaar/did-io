const sinon = require('sinon');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.use(require('sinon-chai'));
chai.should();
const {expect} = chai;

const {LDKeyPair} = require('crypto-ld');
const constants = require('../../lib/methods/veres-one/constants');

const injector = require('../test-injector');

const VeresOneDidDoc = require('../../lib/methods/veres-one/veres-did-doc');

describe('VeresOneDidDoc', () => {
  describe('constructor', () => {
    it('should init the doc with context', () => {
      const didDoc = new VeresOneDidDoc();

      expect(didDoc.doc).to.have.property('@context');
    });

    it('should init the id from the document', () => {
      const testId = 'did:v1:test:abc';
      const testDidDoc = {id: testId};

      const didDoc = new VeresOneDidDoc({doc: testDidDoc});
      expect(didDoc.id).to.equal(testId);
    });
  });

  describe('init', () => {
    let didDoc;
    const keyType = 'Ed25519VerificationKey2018';
    const env = 'dev';

    beforeEach(() => {
      didDoc = new VeresOneDidDoc({keyType, injector});
    });

    it('should init the did id', async () => {
      sinon.spy(didDoc, 'generateId');

      await didDoc.init({env});

      expect(didDoc.generateId).to.have.been.called();
    });

    it('should init the authn/authz suites', async () => {
      await didDoc.init(env);

      expect(didDoc.doc.authentication.length).to.equal(1);
      expect(didDoc.doc.capabilityDelegation.length).to.equal(1);
      expect(didDoc.doc.capabilityInvocation.length).to.equal(1);
    });

    it('should generate an invoke key', async () => {
      await didDoc.init(env);

      const invokeKey = didDoc.doc.capabilityInvocation[0].publicKey[0];
      expect(invokeKey.owner).to.equal(didDoc.id);
      expect(invokeKey.type).to.equal(keyType);
    });
  });

  describe('generateId', () => {
    const keyType = 'Ed25519VerificationKey2018';

    it('should generate a uuid type did', async () => {
      const didType = 'uuid';
      const didDoc = new VeresOneDidDoc({keyType, didType, injector});
      const did = didDoc.generateId({didType, env: 'dev'});

      expect(did).to.match(/^did:v1:test:uuid:.*/);
    });

    it('should generate a nym type did', async () => {
      const didDoc = new VeresOneDidDoc({keyType, didType: 'nym', injector});
      const keyOptions = {
        type: keyType, injector: didDoc.injector, passphrase: null
      };

      const keyPair = await LDKeyPair.generate(keyOptions);
      const did = didDoc.generateId({keyPair, env: 'dev'});

      expect(did).to.match(/^did:v1:test:nym:.*/);
    });
  });

  describe('exportKeys', () => {
    it('should return an empty object when no keys are present', async () => {
      const didDoc = new VeresOneDidDoc();
      expect(await didDoc.exportKeys()).to.eql({});
    });

    it('should return a hashmap of keys by key id', async () => {
      const didDoc = new VeresOneDidDoc({injector});
      await didDoc.init({env: 'test', passphrase: null});

      const keys = await didDoc.exportKeys();

      expect(keys[didDoc.id + '#authn-key-1'])
        .to.have.property('privateKeyBase58');
      expect(keys[didDoc.id + '#ocap-invoke-key-1'])
        .to.have.property('privateKeyBase58');
      expect(keys[didDoc.id + '#ocap-delegate-key-1'])
        .to.have.property('privateKeyBase58');
    });
  });

  describe('importKeys', () => {
    const exampleDoc = require('../dids/did-v1-test-nym-eddsa-example.json');
    const exampleKeys = require('../dids/did-v1-test-nym-eddsa-example-keys.json');
    const keyId = 'did:v1:test:nym:DfKCjXdt3cKzCsi4EGxhYcYvEa8k1Sz6wBH9MREs3y4r#authn-key-1';

    it('should import keys', async () => {
      const didDoc = new VeresOneDidDoc({doc: exampleDoc, injector});

      expect(didDoc.keys).to.eql({}); // no keys

      await didDoc.importKeys(exampleKeys);

      const authKey = didDoc.keys[keyId];
      expect(authKey).to.exist();

      expect(authKey.id).to.equal(keyId);
    });
  });

  describe('addKey/removeKey', () => {
    const exampleDoc = require('../dids/did-v1-test-nym-eddsa-example.json');
    const exampleKeys = require('../dids/did-v1-test-nym-eddsa-example-keys.json');
    const did = 'did:v1:test:nym:DfKCjXdt3cKzCsi4EGxhYcYvEa8k1Sz6wBH9MREs3y4r';
    const keyId = `${did}#authn-key-1`;
    const didDoc = new VeresOneDidDoc({doc: exampleDoc, injector});

    it('should add/remove a public key node from the DID Doc', async () => {
      await didDoc.importKeys(exampleKeys);

      const authSuite = didDoc.doc[constants.SUITES.authentication][0];
      const authKey = authSuite.publicKey[0];

      didDoc.removeKey(authKey);

      // Check to make sure key is removed
      expect(authSuite.publicKey).to.eql([]);
      expect(didDoc.keys[keyId]).to.not.exist();

      // Now re-add the key
      const suiteId = `${did}#auth-suite-1`;

      const key = await LDKeyPair.from(exampleKeys[keyId]);
      await didDoc.addKey({suiteId, key});

      expect(authSuite.publicKey).to.eql([key.publicNode({owner: did})]);
      expect(didDoc.keys[keyId]).to.eql(key);
    });
  });

  describe('service endpoints', () => {
    const exampleDoc = require('../dids/did-v1-test-nym-eddsa-example.json');
    let didDoc;

    beforeEach(() => {
      const doc = JSON.parse(JSON.stringify(exampleDoc)); // clone
      didDoc = new VeresOneDidDoc({doc, injector});
    });

    it('should add a service to the did doc', () => {
      expect(didDoc.hasService({name: 'testAgent'})).to.be.false();
      didDoc.addService({
        name: 'testAgent',
        type: 'AgentService',
        endpoint: 'https://example.com',
        description: 'test description' // this is a custom property
      });
      expect(didDoc.hasService({name: 'testAgent'})).to.be.true();

      expect(didDoc.findService({name: 'testAgent'}).description)
        .to.equal('test description');
    });

    it('should throw when adding a service that already exists', () => {
      const serviceOptions = {
        name: 'testAgent',
        type: 'AgentService',
        endpoint: 'https://example.com',
        description: 'test description' // this is a custom property
      };

      didDoc.addService(serviceOptions);

      expect(() => didDoc.addService(serviceOptions))
        .to.throw(/Service with that name or id already exists/);
    });

    it('should remove a service from the did doc', () => {
      didDoc.addService({
        name: 'testService', type: 'Test', endpoint: 'https://example.com'
      });
      expect(didDoc.hasService({name: 'testService'})).to.be.true();

      didDoc.removeService({name: 'testService'});

      expect(didDoc.hasService({name: 'testService'})).to.be.false();
    });
  });

  describe('toJSON', () => {
    const keyType = 'Ed25519VerificationKey2018';
    it('should only serialize the document, no other properties', () => {
      const didDoc = new VeresOneDidDoc({keyType, injector});

      expect(JSON.stringify(didDoc))
        .to.equal('{"@context":"https://w3id.org/veres-one/v1"}');
    });
  });
});
