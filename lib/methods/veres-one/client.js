/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const url = require('url');
const r2 = require('r2');
const https = require('https');

const DEFAULT_LOCATION = 'ledger';

class VeresOneClient {
  /**
   * @param injector {Injector}
   * @param mode {string} One of 'dev'/'test'/'live'
   * @param logger
   * @param [config] {object}
   * @param [httpsAgent] {Agent}
   */
  constructor({injector, logger, mode, config, httpsAgent}) {
    this.injector = injector;
    this.config = config || require('./veres-one.config');
    this.mode = mode;
    this.logger = logger || console;

    this.httpsAgent = httpsAgent;
    if(mode === 'dev' && !this.httpsAgent) {
      this.httpsAgent = new https.Agent({rejectUnauthorized: false});
    }
  }

  /**
   * Fetches a DID Document for a given DID. If it contains a #hash fragment,
   * it's likely a key id, so just return the subgraph, not the full doc.
   *
   * @param did {string} DID uri (possibly with hash fragment)
   * @param [hostname] {string} Optional hostname of ledger (falls back
   *   to the default hostname for a particular mode)
   *
   * @returns {Promise<object>} Resolves to DID Document Fetch Result
   */
  async get({did, hostname}) {
    if(!did) {
      throw new Error('Invalid or missing DID URI');
    }
    const [docUri, hashFragment] = did.split('#');

    const ledgerAgent = await this.getAgent({hostname});
    const queryServiceUrl = url.parse(ledgerAgent.service.ledgerQueryService);
    queryServiceUrl.search = `id=${docUri}`;
    const didUrl = url.format(queryServiceUrl);

    this.logger.log(`Retrieving DID Document [${hostname || this.mode}]:`,
      docUri);

    const response = await r2({
      url: didUrl,
      method: 'POST',
      agent: this.httpsAgent,
      headers: {
        'accept': 'application/ld+json, application/json'
      }
    }).response;

    if(response.status !== 200) {
      throw new Error('Failed to get DID Document; status=' + response.status);
    }

    const body = await response.json();

    const result = {
      found: true,
      retry: false,
      did: docUri,
      hostname,
      meta: body.meta
    };

    const didDoc = body.object;
    const context = didDoc['@context'];

    if(!hashFragment) {
      // full DID Doc
      result.type = 'LedgerDidDocument';
      result.doc = didDoc;
    } else {
      // Request for a subgraph (likely just the key node)
      const jsonld = this.injector.use('jsonld');
      const map = await jsonld.createNodeMap(didDoc);
      const subGraph = map[did];
      if(!subGraph) {
        throw new Error(
          `Failed to get subgraph within a DID Document, uri: ${did}`);
      }

      // result.type = 'Key'; <- not sure what this should be
      result.doc = await jsonld.compact(subGraph, context);
    }

    return result;
  }

  /**
   * Sends an operation to a Veres One ledger node.
   *
   * @returns {object} response
   */
  async send(options = {}) {
    const ledgerAgent = await this.getAgent(options);
    const {operation} = options;

    const headers = options.headers ||
      {
        'content-type': 'application/ld+json, application/json',
        'accept': 'application/json'
      };

    return r2({
      url: ledgerAgent.service.ledgerOperationService,
      method: 'POST',
      agent: this.httpsAgent,
      headers,
      json: operation
    }).response;
  }

  /**
   * Resolves with a list of ledger agent urls.
   *
   * @param [options={}] {object}
   * @param [options.hostname]
   *
   * @returns {Promise<Array<object>>}
   */
  async getAgents(options = {}) {
    const hostname = this.singleHostname(options);
    const ledgerAgentsUrl = `https://${hostname}/ledger-agents`;

    const headers = {
      'accept': 'application/ld+json, application/json'
    };

    const ledgerAgentRes = await r2({
      url: ledgerAgentsUrl,
      method: 'GET',
      agent: this.httpsAgent,
      headers
    }).json;

    return ledgerAgentRes.ledgerAgent;
  }

  /**
   * Resolves with a single ledger agent for given options (first one).
   *
   * @param options {object} See docstring for `getAgents()` above.
   *
   * @returns {Promise<object>}
   */
  async getAgent(options) {
    const agents = await this.getAgents(options);
    return agents[0];
  }

  static signRequestHeaders({path, headers, signHeaders, keyId, key, method}) {
    const httpSignature = require('http-signature');

    httpSignature.signRequest({
      getHeader: (header) => {
        // case insensitive lookup
        return headers[Object.keys(headers).find(
          key => key.toLowerCase() === header.toLowerCase())];
      },
      setHeader: (header, value) => {
        headers[header] = value;
      },
      method,
      path
    }, {
      headers: signHeaders,
      keyId,
      key
    });
  }

  /**
   * Sends an operation to a Veres One accelerator.
   *
   * @param options {object}
   *
   * @param options.operation {object} WebLedgerOperation
   *
   * @param [options.hostname] {string}
   * @param [options.env] {string} Used to determine default hostname
   *
   * Keys for signing the http request headers
   * @param [options.authKey] {LDKeyPair}
   *
   * @returns response {Promise<Response>} from a fetch() POST.
   */
  async sendToAccelerator(options) {
    const {operation, authKey} = options;
    const hostname = options.hostname || this.defaultHostname();

    const acceleratorPath = '/accelerator/proofs';
    const acceleratorUrl = `https://${hostname}${acceleratorPath}`;

    const headers = {
      'accept': 'application/ld+json, application/json',
      'host': hostname
    };

    if(authKey && authKey.keyType === 'RsaVerificationKey2018') {
      const secretKey = await authKey.export();

      VeresOneClient.signRequestHeaders({
        path: acceleratorPath,
        headers,
        signHeaders: ['(request-target)', 'date', 'host'],
        keyId: authKey.id,
        key: secretKey.secretKeyBase58 || secretKey.secretKeyPem,
        method: 'POST'
      });
    }

    return r2({
      url: acceleratorUrl,
      method: 'POST',
      agent: this.httpsAgent,
      headers,
      json: operation
    }).response;
  }

  /**
   * @param options {object}
   * @param [options.hostname] {string|Array<string>} One or more hostnames
   *
   * @throws {Error} If no hostnames are provided and mode is unknown
   *
   * @returns {Array<string>} List of hostnames for given options
   */
  hostnames(options) {
    const location = options.location || DEFAULT_LOCATION;
    const overrides = this.optionHostnames(options);

    let hostnames = [...overrides]; // start with user-provided overrides

    if(['ledger-all', 'all'].includes(location)) {
      // add all the hostnames for a mode
      hostnames = hostnames.concat(this.modeHostnames(this.mode));
    }
    // if location is 'any', 'ledger', 'both', no further action needed

    if(!hostnames.length) {
      hostnames = [this.defaultHostname()];
    }

    return Array.from(new Set(hostnames)); // de-duplicate
  }

  /**
   * @param mode {string} Client mode ('test', 'live', 'dev' etc)
   *
   * @throws {Error} If mode is unknown
   *
   * @returns {Array<string>} Hostnames for a given mode
   */
  modeHostnames(mode) {
    if(mode === 'test') {
      return this.config.hostnames.testnet;
    }
    return [this.defaultHostname()];
  }

  /**
   * @param options {object}
   * @param [options.hostname] {string} Override hostname
   *
   * @throws {Error} If no override hostname is provided and mode is unknown,
   *  or if more than one override is provided
   *
   * @returns {string} A single hostname for given options
   */
  singleHostname(options) {
    const overrides = this.optionHostnames(options);
    if(overrides.length > 1) {
      throw new Error('Too many hostnames provided');
    }
    if(overrides.length === 1) {
      return overrides[0];
    }
    return this.defaultHostname();
  }

  /**
   * @param [hostname=[]] {string|Array<string>} One or more hostnames
   *
   * @returns {Array<string>} List of hostname overrides
   */
  optionHostnames({hostname = []}) {
    return [].concat(hostname);
  }

  /**
   * @throws {Error} If this client's mode is unknown
   *
   * @returns {string} Hostname for current client
   */
  defaultHostname() {
    switch(this.mode) {
      case 'dev':
        return 'genesis.veres.one.localhost:42443';
      case 'test':
        return 'genesis.testnet.veres.one';
      case 'live':
        return 'veres.one';
      default:
        throw new Error('Unknown mode');
    }
  }
}

module.exports = VeresOneClient;
