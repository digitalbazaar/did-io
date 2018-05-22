/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Constants = require('./constants');
const {LDKeyPair} = require('../../ld-key-pair');
const didUtil = require('../../util');

const uuid = require('uuid/v4');
const jsonpatch = require('fast-json-patch');

class VeresOneDidDoc {
  constructor(options = {}) {
    this.injector = options.injector;

    this.doc = options.doc || {'@context': Constants.VERES_ONE_V1_CONTEXT};
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
    const keyType = options.keyType || Constants.DEFAULT_KEY_TYPE;
    if(!Constants.SUPPORTED_KEY_TYPES.includes(keyType)) {
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
  async init({env, passphrase, didType, keyType = Constants.DEFAULT_KEY_TYPE}) {
    const keyOptions = {injector: this.injector, keyType, passphrase};
    const authKey = await LDKeyPair.generate(keyOptions);

    const did = this.generateId({authKey, didType, env});
    this.doc.id = did;
    authKey.id = `${did}#authn-key-1`;
    this.doc[Constants.SUITES.authentication] = [
      this.generateSuite(authKey)
    ];
    this.keys[authKey.id] = authKey;

    const grantKey = await LDKeyPair.generate(keyOptions);
    grantKey.id = `${did}#ocap-grant-key-1`;
    this.doc[Constants.SUITES.grantCapability] = [
      this.generateSuite(grantKey)
    ];
    this.keys[grantKey.id] = grantKey;

    const invokeKey = await LDKeyPair.generate(keyOptions);
    invokeKey.id = `${did}#ocap-invoke-key-1`;
    this.doc[Constants.SUITES.invokeCapability] = [
      this.generateSuite(invokeKey)
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

  generateSuite(key) {
    const suiteType = key.keyType === 'Ed25519VerificationKey2018'
      ? 'Ed25519SignatureCapabilityAuthorization2018'
      : 'RsaSignatureCapabilityAuthorization2018';

    return {
      type: suiteType,
      publicKey: [ key.publicNode({owner: this.id}) ]
    };
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
      '@context': Constants.VERES_ONE_V1_CONTEXT,
      target: this.id,
      sequence: this.meta.sequence,
      patch
    };
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
      const key = await LDKeyPair.from(keyData, {injector: this.injector, ...options});
      this.keys[key.id] = key;
    }
  }

  toJSON() {
    return this.doc;
  }
}

module.exports = VeresOneDidDoc;
