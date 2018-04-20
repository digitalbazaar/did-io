const nock = require('nock');
const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const url = require('url');
const tls = require('tls');
tls.DEFAULT_ECDH_CURVE = 'auto';

const VeresOneClient = require('../../lib/methods/veres-one/client');

const TEST_DID = 'did:v1:test:nym:2pfPix2tcwa7gNoMRxdcHbEyFGqaVBPNntCsDZexVeHX';
const TEST_DID_RESULT = require('../dids/genesis.testnet.did.json');
const LEDGER_AGENTS_DOC = require('../dids/ledger-agents.json');

describe('did methods', () => {
  let client;

  before(() => {
    client = new VeresOneClient();
  });

  describe('veres one client', () => {
    describe('getAgent', () => {
      it('should resolve with an agent url for a ledger', async () => {
        nock('https://genesis.testnet.veres.one')
          .get(`/ledger-agents`)
          .reply(200, LEDGER_AGENTS_DOC);

        const agent = await client.getAgent({ mode: 'test' });
        expect(agent.id.startsWith('urn:uuid:')).to.be.true();
        const {ledgerConfigService} = agent.service;
        expect(ledgerConfigService.endsWith('/config')).to.be.true();
      });
    });

    describe('get', () => {
      it('should fetch a did doc from ledger via https', async () => {
        nock('https://genesis.testnet.veres.one')
          .get(`/ledger-agents`)
          .reply(200, LEDGER_AGENTS_DOC);

        nock('https://genesis.testnet.veres.one')
          .post('/ledger-agents/72fdcd6a-5861-4307-ba3d-cbb72509533c' +
               '/query?id=' + TEST_DID)
          .reply(200, TEST_DID_RESULT);

        const result = await client.get(TEST_DID);
        // console.log(JSON.stringify(result, 0, 2));
        expect(result.doc.object.id).to.equal(TEST_DID);
      });
    });

    describe('hostnames', () => {
      it('should de-duplicate hostname lists', () => {
        expect(client.hostnames({hostname: ['example.com', 'example.com']}))
          .to.eql(['example.com']);
      });

      it('should return all the mode hostnames if no overrides', () => {
        expect(client.hostnames({mode: 'test', location: 'all'}))
          .to.eql(client.config.hostnames.testnet);
      });

      it('should return default hostname by default', () => {
        expect(client.hostnames({mode: 'live'}))
          .to.eql(['veres.one']);
      });
    });

    describe('optionHostnames', () => {
      it('should return empty list if no hostname options provided', () => {
        expect(client.optionHostnames({})).to.eql([]);
      });

      it('should handle a single hostname string', () => {
        expect(client.optionHostnames({hostname: 'example.com'}))
          .to.eql(['example.com']);
      });

      it('should handle a list of hostnames', () => {
        expect(client.optionHostnames({hostname: ['example.com', 'example.net']}))
          .to.eql(['example.com', 'example.net']);
      });
    });

    describe('modeHostnames', () => {
      it('should return all mode hostnames, if applicable', () => {
        expect(client.modeHostnames({mode: 'test'}))
          .to.eql(client.config.hostnames.testnet);
      });

      it('should return a default hostname if no more are provided', () => {
        expect(client.modeHostnames({mode: 'live'}))
          .to.eql(['veres.one']);
      });
    });

    describe('singleHostname', () => {
      it('should throw an error if more than one hostname is passed in', () => {
        expect(() => client.singleHostname({hostname: ['e1.com', 'e2.com']}))
          .to.throw(/Too many hostnames provided/);
      });

      it('should return a default hostname if no override is passed in', () => {
        expect(client.singleHostname({}))
          .to.equal('genesis.testnet.veres.one');
      });

      it('should return a single override hostname', () => {
        expect(client.singleHostname({hostname: 'example.com'}))
          .to.equal('example.com');
      });
    });

    describe('defaultHostname', () => {
      it('should return default hostname based on mode', () => {
        expect(client.defaultHostname({mode: 'dev'}))
          .to.equal('genesis.veres.one.localhost:42443');

        expect(client.defaultHostname({mode: 'test'}))
          .to.equal('genesis.testnet.veres.one');

        expect(client.defaultHostname({mode: 'live'}))
          .to.equal('veres.one');
      });

      it('should throw error for unknown or missing mode', () => {
        expect(() => client.defaultHostname({mode: '...'})).to.throw(Error);
      });
    });
  });
});
