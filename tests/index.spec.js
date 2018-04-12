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

    describe('hostnames', () => {
      it('should de-duplicate hostname lists', () => {
        expect(v1.hostnames({hostname: ['example.com', 'example.com']}))
          .to.eql(['example.com']);
      });

      it('should return all the mode hostnames if no overrides', () => {
        expect(v1.hostnames({mode: 'test', location: 'all'}))
          .to.eql(v1.config.hostnames.testnet);
      });

      it('should return default hostname by default', () => {
        expect(v1.hostnames({mode: 'live'}))
          .to.eql(['veres.one']);
      });
    });

    describe('optionHostnames', () => {
      it('should return empty list if no hostname options provided', () => {
        expect(v1.optionHostnames({})).to.eql([]);
      });

      it('should handle a single hostname string', () => {
        expect(v1.optionHostnames({hostname: 'example.com'}))
          .to.eql(['example.com']);
      });

      it('should handle a list of hostnames', () => {
        expect(v1.optionHostnames({hostname: ['example.com', 'example.net']}))
          .to.eql(['example.com', 'example.net']);
      });
    });

    describe('modeHostnames', () => {
      it('should return all mode hostnames, if applicable', () => {
        expect(v1.modeHostnames({mode: 'test'}))
          .to.eql(v1.config.hostnames.testnet);
      });

      it('should return a default hostname if no more are provided', () => {
        expect(v1.modeHostnames({mode: 'live'}))
          .to.eql(['veres.one']);
      });
    });

    describe('singleHostname', () => {
      it('should throw an error if more than one hostname is passed in', () => {
        expect(() => v1.singleHostname({hostname: ['e1.com', 'e2.com']}))
          .to.throw(/Too many hostnames provided/);
      });

      it('should return a default hostname if no override is passed in', () => {
        expect(v1.singleHostname({}))
          .to.equal('genesis.testnet.veres.one');
      });

      it('should return a single override hostname', () => {
        expect(v1.singleHostname({hostname: 'example.com'}))
          .to.equal('example.com');
      });
    });

    describe('defaultHostname', () => {
      it('should return default hostname based on mode', () => {
        expect(v1.defaultHostname({mode: 'dev'}))
          .to.equal('genesis.veres.one.localhost:42443');

        expect(v1.defaultHostname({mode: 'test'}))
          .to.equal('genesis.testnet.veres.one');

        expect(v1.defaultHostname({mode: 'live'}))
          .to.equal('veres.one');
      });

      it('should throw error for unknown or missing mode', () => {
        expect(() => v1.defaultHostname({mode: '...'})).to.throw(Error);
      });
    });
  });
});
