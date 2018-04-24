const sinon = require('sinon');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.use(require('sinon-chai'));
chai.should();
const {expect} = chai;

const VeresOneDidDoc = require('../../lib/methods/veres-one/veres-did-doc');

describe.only('VeresOneDidDoc', () => {
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

    beforeEach(() => {
      didDoc = new VeresOneDidDoc();
    });

    it('should init the did id', () => {
      const env = 'dev';
      sinon.stub(didDoc, 'initId');

      didDoc.init(env);

      expect(didDoc.initId).to.have.been.calledWith(env);
    });

    it('should init the authn/authz suites', () => {
      const env = 'dev';
      sinon.stub(didDoc, 'initSuites');

      didDoc.init(env);

      expect(didDoc.initSuites).to.have.been.called();
    });
  });

  describe('initId', () => {
    it('should init a uuid type did', () => {
      const didDoc = new VeresOneDidDoc({didType: 'uuid'});
      didDoc.initId('dev');

      expect(didDoc.id).to.match(/^did:v1:test:uuid:.*/);
    });
  });

  describe('toJSON', () => {
    it('should only serialize the document, no other properties', () => {
      const didDoc = new VeresOneDidDoc();

      expect(JSON.stringify(didDoc))
        .to.equal('{"@context":"https://w3id.org/veres-one/v1"}');
    });
  });
});
