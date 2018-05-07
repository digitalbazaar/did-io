/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Constants = require('./constants');
const {LDKeyPair} = require('../../ld-key-pair');
const didUtil = require('../../util');

const uuid = require('uuid/v4');

class VeresOneDidDoc {
  constructor(options = {}) {
    this.injector = options.injector;
    this.didType = options.didType || 'nym';
    this.keyType = options.keyType || Constants.DEFAULT_KEY_TYPE;

    this.doc = options.doc || {'@context': Constants.VERES_ONE_V1_CONTEXT};

    // Includes private keys -- this property will not be serialized.
    this.keys = options.keys ||
      {authentication: [], grantCapability: [], invokeCapability: []};
  }

  /**
   * Generates a new DID Document and initializes various authentication
   * and authorization suite keys.
   *
   * @param options
   * @param [options.didType='nym'] {string} DID type, 'nym' or 'uuid'
   * @param [options.keyType] {string}
   * @param [options.passphrase] {string}
   * @param [options.env] {string} 'dev'/'live' etc.
   * @param [options.injector]
   *
   * @throws {Error}
   *
   * @returns {VeresOneDidDoc}
   */
  static async generate(options) {
    if(!Constants.SUPPORTED_KEY_TYPES.includes(options.keyType)) {
      throw new Error(`Unknown key type: "${options.keyType}"`);
    }

    const did = new VeresOneDidDoc(options);
    await did.init({env: options.env, passphrase: options.passphrase});
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
   *
   * @param env
   * @param passphrase
   *
   * @returns {Promise}
   */
  async init({env, passphrase}) {
    const keyOptions = {
      keyType: this.keyType, injector: this.injector, passphrase
    };

    const authKey = await LDKeyPair.generate(keyOptions);
    const did = this.generateId({authKey, env});
    this.doc.id = did;
    authKey.id = `${did}#authn-key-1`;
    this.doc.authentication = [
      this.generateSuite(authKey)
    ];
    this.keys.authentication.push(authKey);

    const grantKey = await LDKeyPair.generate(keyOptions);
    grantKey.id = `${did}#ocap-grant-key-1`;
    this.doc.grantCapability = [
      this.generateSuite(grantKey)
    ];
    this.keys.grantCapability.push(grantKey);

    const invokeKey = await LDKeyPair.generate(keyOptions);
    invokeKey.id = `${did}#ocap-invoke-key-1`;
    this.doc.invokeCapability = [
      this.generateSuite(invokeKey)
    ];
    this.keys.invokeCapability.push(invokeKey);
  }

  /**
   * @param authKey {LDKeyPair}
   * @param env {string}
   *
   * @returns {string} DID uri
   */
  generateId({authKey, env = 'dev'}) {
    if(this.didType === 'uuid') {
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
    const keyNode = {
      id: key.id,
      type: key.keyType,
      owner: this.id
    };
    key.addEncodedPublicKey(keyNode);

    const suiteType = this.keyType === 'Ed25519VerificationKey2018'
      ? 'Ed25519SignatureCapabilityAuthorization2018'
      : 'RsaSignatureCapabilityAuthorization2018';

    return {
      type: suiteType,
      publicKey: [ keyNode ]
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

  toJSON() {
    return this.doc;
  }
}

module.exports = VeresOneDidDoc;
