/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const constants = require('./constants');
const {LDKeyPair} = require('../../ld-key-pair');

const uuid = require('uuid/v4');
const jsonpatch = require('fast-json-patch');

class VeresOneDidDoc {
  constructor(options = {}) {
    this.injector = options.injector;

    this.doc = options.doc || {'@context': constants.VERES_ONE_V1_CONTEXT};
    this.meta = options.meta || {sequence: 0};

    this.observer = null; // JSON Patch change observer

    // Includes private keys -- this property will not be serialized.
    this.keys = options.keys || {};
  }

  /**
   * Generates a new DID Document and initializes various authentication
   * and authorization suite keys.
   *
   * @param options
   * @param [options.injector]
   *
   * Params needed for DID generation:
   * @param [options.didType='nym'] {string} DID type, 'nym' or 'uuid'
   * @param [options.env] {string} 'dev'/'live' etc.
   *
   * Params needed for key generation:
   * @param [options.keyType] {string}
   * @param [options.passphrase] {string}
   *
   * @throws {Error}
   *
   * @returns {VeresOneDidDoc}
   */
  static async generate(options) {
    const keyType = options.keyType || constants.DEFAULT_KEY_TYPE;
    if(!constants.SUPPORTED_KEY_TYPES.includes(keyType)) {
      throw new Error(`Unknown key type: "${keyType}"`);
    }

    const did = new VeresOneDidDoc(options);
    await did.init({keyType, ...options});
    return did;
  }

  /**
   * Returns the DID uri.
   */
  get id() {
    return this.doc.id;
  }

  /**
   * Initializes an empty (newly created) DID document, by generating an id,
   * as well as authentication and authorization suites.
   * Only called when generating a new DID Doc (creates new keys, etc).
   *
   * @param [env]
   * @param [passphrase]
   * @param [keyType] {string}
   * @param [didType] {string}
   *
   * @returns {Promise}
   */
  async init({env, passphrase, didType, keyType = constants.DEFAULT_KEY_TYPE}) {
    const keyOptions = {injector: this.injector, keyType, passphrase};

    // Generate a capabilityInvocation key, to base the DID URI on
    const invokeKey = await LDKeyPair.generate(keyOptions);
    const did = this.generateId({keyPair: invokeKey, didType, env});
    this.doc.id = did;

    // Generate an authentication key pair and suite
    const authKey = await LDKeyPair.generate(keyOptions);
    authKey.id = `${did}#authn-key-1`;
    this.doc[constants.SUITES.authentication] = [
      this.generateSuite({key: authKey, suiteId: `${did}#auth-suite-1`})
    ];
    this.keys[authKey.id] = authKey;

    // Generate a capabilityDelegation key pair and suite
    const delegateKey = await LDKeyPair.generate(keyOptions);
    delegateKey.id = `${did}#ocap-delegate-key-1`;
    this.doc[constants.SUITES.capabilityDelegation] = [
      this.generateSuite({key: delegateKey, suiteId: `${did}#delegate-suite-1`})
    ];
    this.keys[delegateKey.id] = delegateKey;

    // Generate a capabilityInvocation suite (from an earlier generated key)
    invokeKey.id = `${did}#ocap-invoke-key-1`;
    this.doc[constants.SUITES.capabilityInvocation] = [
      this.generateSuite({key: invokeKey, suiteId: `${did}#invoke-suite-1`})
    ];
    this.keys[invokeKey.id] = invokeKey;
  }

  /**
   * Generates a DID uri, either as a globally unique random string (uuid),
   * or from a given key pair (in case of cryptonym type did).
   *
   * @param [keyPair] {LDKeyPair}
   * @param [didType='nym'] {string} 'uuid' or 'nym'. If 'nym', a key pair
   *   must also be passed in (to generate the did uri from).
   * @param [env='dev'] {string}
   *
   * @returns {string} DID uri
   */
  generateId({keyPair, didType = 'nym', env = 'dev'}) {
    if(didType === 'uuid') {
      const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';
      return (prefix + 'uuid:' + uuid()).replace(/-/g, '');
    }

    if(!keyPair) {
      throw new Error('Cannot generate a cryptonym DID without a key');
    }

    // didType === 'nym'
    return this.createCryptonymDid({keyPair, env});
  }

  generateSuite({key, suiteId}) {
    const suiteType = key.keyType === 'Ed25519VerificationKey2018'
      ? 'Ed25519SignatureCapabilityAuthorization2018'
      : 'RsaSignatureCapabilityAuthorization2018';

    return {
      id: suiteId,
      type: suiteType,
      publicKey: [ key.publicNode({owner: this.id}) ]
    };
  }

  suiteForId(suiteId) {
    for(const suiteType in constants.SUITES) {
      const suites = this.doc[suiteType];
      const found = suites.find(s => s.id === suiteId);
      if(found) {return found;}
    }
  }

  /**
   * Creates a cryptonym DID from a given key pair.
   *
   * @param keyPair {LDKeyPair}
   * @param [env='dev'] {string}
   */
  createCryptonymDid({keyPair, env = 'dev'}) {
    const prefix = (env === 'live') ? 'did:v1' : 'did:v1:test';

    return `${prefix}:nym:` +
      'z' + // append multibase base58 (0x7a / z) encoding
      keyPair.fingerprint();
  }

  /**
   * Starts observing changes made to the DID Document, in order to create a
   * diff patch to send to the ledger. Used for updating the doc.
   */
  observe() {
    if(this.observer) {
      this.unobserve();
    }
    this.observer = jsonpatch.observe(this.doc);
  }

  /**
   * Stops observing for changes.
   */
  unobserve() {
    if(!this.observer) {
      throw new Error('Not observing changes');
    }
    jsonpatch.unobserve(this.doc, this.observer);
    this.observer = null;
  }

  /**
   * Stops observing for changes, and returns a changeset document (based on
   * JSON Patch), for sending updates to ledger.
   *
   * @returns {object}
   */
  commit() {
    if(!this.observer) {
      throw new Error('Not observing changes');
    }
    const patch = jsonpatch.generate(this.observer);

    this.unobserve();

    return {
      '@context': constants.VERES_ONE_V1_CONTEXT,
      target: this.id,
      sequence: this.meta.sequence,
      patch
    };
  }

  /**
   * Composes and returns a service id for a service name.
   *
   * @param serviceName {string}
   *
   * @returns {string} Service id
   */
  serviceIdFor(serviceName) {
    if(!serviceName) {
      throw new Error('Invalid service name');
    }

    return this.id + ';service=' + encodeURIComponent(serviceName);
  }

  /**
   * Finds a service endpoint in this did doc, given an id or a name.
   *
   * @param [id] {string}
   * @param [name] {string}
   *
   * @returns {object}
   */
  findService({id, name}) {
    const jsonld = this.injector.use('jsonld');

    const serviceId = id || this.serviceIdFor(name);

    return jsonld
      .getValues(this.doc, 'service')
      .find(service => service.id === serviceId);
  }

  /**
   * Tests whether this did doc has a service endpoint (by name or id).
   * One of `id` or `name` is required.
   *
   * @param [id] {string}
   * @param [name] {string}
   *
   * @returns {boolean}
   */
  hasService({id, name}) {
    return !!this.findService({id, name});
  }

  /**
   * Adds a service endpoint to this did doc.
   * One of `id` or `name` is required.
   *
   * @param [id] {string}
   * @param [name] {string}
   * @param type {string} Endpoint type (e.g. 'AgentService')
   * @param endpoint {string} Endpoint uri (e.g. 'https://agent.example.com')
   * @param [options] {object} Any additional properties of endpoint
   */
  addService({id, name, type, endpoint, ...options}) {
    const jsonld = this.injector.use('jsonld');

    const serviceId = id || this.serviceIdFor(name);

    if(!type) {
      throw new Error('Service endpoint type is required');
    }
    if(!endpoint) {
      throw new Error('Service endpoint uri is required');
    }

    if(this.findService({id, name})) {
      throw new Error('Service with that name or id already exists');
    }

    jsonld.addValue(this.doc, 'service', {
      id: serviceId,
      serviceEndpoint: endpoint,
      type,
      ...options
    }, {
      propertyIsArray: true
    });
  }

  /**
   * Removes a service endpoint from this did doc.
   * One of `id` or `name` is required.
   *
   * @param [id] {string}
   * @param [name] {string}
   */
  removeService({id, name}) {
    const jsonld = this.injector.use('jsonld');

    const serviceId = id || this.serviceIdFor(name);

    const services = jsonld
      .getValues(this.doc, 'service')
      .filter(service => service.id !== serviceId);
    if(services.length === 0) {
      jsonld.removeProperty(this.doc, 'service');
    } else {
      this.doc.service = services;
    }
  }

  addKey({key, suiteId, owner = this.id}) {
    const suite = this.suiteForId(suiteId);
    suite.publicKey.push(key.publicNode({owner}));

    this.keys[key.id] = key;
  }

  removeKey(key) {
    const jsonld = this.injector.use('jsonld');
    // check all suites
    for(const suiteType in constants.SUITES) {
      for(const suiteParams of jsonld.getValues(this.doc, suiteType)) {
        suiteParams.publicKey = jsonld.getValues(suiteParams, 'publicKey')
          .filter(k => k.id !== key.id);
      }
    }

    // also remove key from this doc's keys hash
    delete this.keys[key.id];
  }

  async exportKeys() {
    const exportedKeys = {};

    for(const keyId in this.keys) {
      const key = this.keys[keyId];
      exportedKeys[key.id] = await key.export();
    }

    return exportedKeys;
  }

  /**
   * @param data {object} Parsed exported key JSON
   * @param [options={}] {object}
   * @param [options.passphrase] {string}
   *
   * @returns {Promise}
   */
  async importKeys(data = {}, options = {}) {
    for(const keyData of Object.values(data)) {
      const key = await LDKeyPair.from(keyData,
        {injector: this.injector, ...options});
      this.keys[key.id] = key;
    }
  }

  toJSON() {
    return this.doc;
  }
}

module.exports = VeresOneDidDoc;
