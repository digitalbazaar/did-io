const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const dids = require('../lib/index');
const jsonld = require('jsonld')();
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', jsonld);
// const eproofs = require('equihash-signature');
// eproofs.install(jsigs);

describe('dids api', () => {
  it('accept JSON-LD libs via injector', () => {
    dids.use('jsonld', jsonld);
    dids.use('jsonld-signatures', jsigs);

    const v1 = dids.methods.veres();

    expect(v1.injector._libs).to.have.property('jsonld');
  });
});

describe('did methods', () => {
  let v1;

  before(() => {
    dids.use('jsonld', jsonld);
    dids.use('jsonld-signatures', jsigs);
    v1 = dids.methods.veres();
  });

  describe('veres one', () => {
    it('should exist', () => {
      expect(v1.ledger).to.equal('veres');
    });
  });
});
