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

  get id() {
    return this.doc.id;
  }

  async init({env, passphrase}) {
    await this.generateKeys(passphrase);
    this.initId(env);
    this.initSuites();
  }

  async generateKeys(passphrase) {
    const keyOptions = {
      keyType: this.keyType, injector: this.injector, passphrase
    };
    this.keys.authentication.push(await LDKeyPair.generate(keyOptions));
    this.keys.grantCapability.push(await LDKeyPair.generate(keyOptions));
    this.keys.invokeCapability.push(await LDKeyPair.generate(keyOptions));
  }

  initId(env = 'dev') {
    if(this.didType === 'uuid') {
      const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';
      this.doc.id = (prefix + 'uuid:' + uuid()).replace(/-/g, '');
      return;
    }

    // didType === 'nym'
    const authKey = this.keys.authentication[0];
    if(!authKey) {
      throw new Error('Nym type DIDs require a generated key to init the ID');
    }

    const did = this.createCryptonymDid({
      publicKey: authKey.publicKey,
      encoding: typeof authKey.publicKey === 'string' ?
        'base58' : 'forge',
      env
    });
    this.doc.id = did;
  }

  initSuites() {
    this.initAuthenticationSuite();
    this.initCapabilitySuite('grantCapability');
    this.initCapabilitySuite('invokeCapability');
  }

  /**
   * Initializes and adds an authentication suite to the DID Document,
   * used for authenticating as DID entity
   */
  initAuthenticationSuite() {
    const authKey = this.keys.authentication[0];

    const publicKeyHash = 'authn-key-1';
    const keyNode = {
      id: this.id + '#' + publicKeyHash,
      type: authKey.keyType,
      owner: this.id
    };
    authKey.addEncodedPublicKey(keyNode);

    const suiteType = this.keyType === 'Ed25519VerificationKey2018'
      ? 'Ed25519SignatureAuthentication2018'
      : 'RsaSignatureAuthentication2018';

    const appSuite = {
      type: suiteType,
      publicKey: [ keyNode ]
    };

    this.doc.authentication = [ appSuite ]; // Add suite to the DID Doc
  }

  initCapabilitySuite(suite) {
    const suiteKey = this.keys[suite][0];

    const publicKeyHash = suite + '-key-1';
    const keyNode = {
      id: this.id + '#' + publicKeyHash,
      type: suiteKey.keyType,
      owner: this.id
    };
    suiteKey.addEncodedPublicKey(keyNode);

    const suiteType = this.keyType === 'Ed25519VerificationKey2018'
      ? 'Ed25519SignatureCapabilityAuthorization2018'
      : 'RsaSignatureCapabilityAuthorization2018';

    const appSuite = {
      type: suiteType,
      publicKey: [ keyNode ]
    };

    this.doc[suite] = [ appSuite ]; // Add suite to the DID Doc
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
