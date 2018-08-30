/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const constants = require('./constants');
const {LDKeyPair} = require('../../ld-key-pair');
const didUtil = require('../../util');

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
    const authKey = await LDKeyPair.generate(keyOptions);

    const did = this.generateId({authKey, didType, env});
    this.doc.id = did;
    authKey.id = `${did}#authn-key-1`;
    this.doc[constants.SUITES.authentication] = [
      this.generateSuite({key: authKey, suiteId: `${did}#auth-suite-1`})
    ];
    this.keys[authKey.id] = authKey;

    const grantKey = await LDKeyPair.generate(keyOptions);
    grantKey.id = `${did}#ocap-grant-key-1`;
    this.doc[constants.SUITES.grantCapability] = [
      this.generateSuite({key: grantKey, suiteId: `${did}#grant-suite-1`})
    ];
    this.keys[grantKey.id] = grantKey;

    const invokeKey = await LDKeyPair.generate(keyOptions);
    invokeKey.id = `${did}#ocap-invoke-key-1`;
    this.doc[constants.SUITES.invokeCapability] = [
      this.generateSuite({key: invokeKey, suiteId: `${did}#invoke-suite-1`})
    ];
    this.keys[invokeKey.id] = invokeKey;
  }

  /**
   * @param authKey {LDKeyPair}
   * @param didType {string}
   * @param env {string}
   *
   * @returns {string} DID uri
   */
  generateId({authKey, didType = 'nym', env = 'dev'}) {
    if(didType === 'uuid') {
      const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';
      return (prefix + 'uuid:' + uuid()).replace(/-/g, '');
    }

    // didType === 'nym'
    return this.createCryptonymDid({
      publicKey: authKey.publicKey,
      encoding: typeof authKey.publicKey === 'string' ?
        'base58' : 'forge',
      env
    });
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
   * Creates a cryptonym DID from a public key with encoding `pem`, `base58`,
   * or `forge` (forge is supported privately/internally only).
   */
  createCryptonymDid({publicKey, encoding, env = 'dev'}) {
    if(!['forge', 'pem', 'base58'].includes(encoding)) {
      throw new TypeError('`encoding` must be `pem` or `base58`.');
    }

    const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';

    const did = prefix + 'nym:';
    if(encoding === 'base58') {
      return did + publicKey;
    }

    const forge = this.injector.use('node-forge');

    if(encoding === 'pem') {
      // deserialize key from PEM
      publicKey = forge.pki.publicKeyFromPem(publicKey);
    }

    // use SubjectPublicKeyInfo fingerprint
    const fingerprintBuffer = forge.pki.getPublicKeyFingerprint(
      publicKey, {md: forge.md.sha256.create()});
    return did + didUtil.encodeBase64Url(fingerprintBuffer.bytes(), {forge});
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
