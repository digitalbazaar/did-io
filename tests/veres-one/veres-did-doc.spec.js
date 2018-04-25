const sinon = require('sinon');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.use(require('sinon-chai'));
chai.should();
const {expect} = chai;

const Injector = require('../../lib/Injector');
const injector = new Injector();
injector.env = {nodejs: true};

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

    beforeEach(() => {
      didDoc = new VeresOneDidDoc({keyType, injector});
    });

    it('should init the did id', async () => {
      const env = 'dev';
      sinon.stub(didDoc, 'generateKeys').resolves();
      sinon.stub(didDoc, 'initId');
      sinon.stub(didDoc, 'initSuites');

      await didDoc.init({env});

      expect(didDoc.initId).to.have.been.calledWith(env);
    });

    it('should init the authn/authz suites', async () => {
      const env = 'dev';
      sinon.stub(didDoc, 'generateKeys').resolves();
      sinon.stub(didDoc, 'initId');
      sinon.stub(didDoc, 'initSuites');

      await didDoc.init(env);

      expect(didDoc.initSuites).to.have.been.called();
    });
  });

  describe('initId', () => {
    const keyType = 'Ed25519VerificationKey2018';

    it('should init a uuid type did', async () => {
      const didDoc = new VeresOneDidDoc({keyType, didType: 'uuid', injector});
      await didDoc.generateKeys();
      didDoc.initId('dev');

      expect(didDoc.id).to.match(/^did:v1:test:uuid:.*/);
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
