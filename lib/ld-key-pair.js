/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const forge = require('node-forge');

const Injector = require('./Injector');
const didUtil = require('./util');

const DEFAULT_RSA_KEY_BITS = 2048;
const DEFAULT_RSA_EXPONENT = 0x10001;

class LDKeyPair {
  constructor(options) {
    this.injector = options.injector || new Injector();
    this.keyType = options.keyType;
    this.publicKey = options.publicKey;
    this.privateKey = options.privateKey;
    this.passphrase = options.passphrase || null;
    this.id = options.id;
  }

  /**
   * @param [options]
   * @param [options.keyType]
   * @param [options.injector]
   * @param [options.passphrase]
   *
   * @returns {Promise<LDKeyPair>}
   */
  static async generate(options) {
    switch(options.keyType) {
      case 'Ed25519VerificationKey2018':
        return Ed25519KeyPair.generate(options);

      case 'RsaVerificationKey2018':
        return RSAKeyPair.generate(options);

      default:
        throw new Error(`Unsupported Key Type: ${options.keyType}`);
    }
  }

  /**
   * @param data {object} Serialized LD key object
   * @param data.keyType {string}
   *
   * @param [options]
   * @param [options.injector]
   * @param [options.passphrase]
   *
   * @returns {Promise<LDKeyPair>}
   */
  static async from(data, options) {
    switch(data.keyType) {
      case 'Ed25519VerificationKey2018':
        return Ed25519KeyPair.from(data, options);

      case 'RsaVerificationKey2018':
        return RSAKeyPair.from(data, options);

      default:
        throw new Error(`Unsupported Key Type: ${options.keyType}`);
    }
  }

  static async pbkdf2(password, salt, iterations, keySize) {
    return new Promise((resolve, reject) => {
      forge.pkcs5.pbkdf2(password, salt, iterations, keySize, (err, key) =>
        err ? reject(err) : resolve(key));
    });
  }

  /**
   * @param owner {string} DID of key owner
   */
  publicNode({owner}) {
    const publicNode = {
      id: this.id,
      type: this.keyType,
      owner
    };
    this.addEncodedPublicKey(publicNode);
    return publicNode;
  }
}

class Ed25519KeyPair extends LDKeyPair {
  constructor(options) {
    super(options);
    // currently node only
    if(!this.injector.env.nodejs) {
      throw new Error(
        '"Ed25519VerificationKey2018" is not supported on this platform yet.');
    }
  }

  /**
   * @param [options]
   * @param [options.keyType]
   * @param [options.injector]
   *
   * @returns {Promise<Ed25519KeyPair>}
   */
  static async generate(options) {
    const bs58 = require('bs58');
    const chloride = require('chloride');
    const keyPair = chloride.crypto_sign_keypair();

    const keys = new Ed25519KeyPair({
      publicKey: bs58.encode(keyPair.publicKey),
      privateKey: bs58.encode(keyPair.secretKey),
      ...options
    });

    return keys;
  }

  static async from(data, options) {
    const keyPair = new Ed25519KeyPair({
      publicKey: data.publicKeyBase58,
      privateKey: data.privateKeyBase58,
      id: data.id,
      keyType: data.keyType,
      ...options
    });

    return keyPair;
  }

  // publicKeyPem, publicKeyJwk, publicKeyHex, publicKeyBase64, publicKeyBase58
  async export() {
    const keyNode = {
      id: this.id,
      keyType: this.keyType,
      publicKeyBase58: this.publicKey
    };

    return this.addEncryptedPrivateKey(keyNode);
  }

  addEncodedPublicKey(publicKeyNode) {
    publicKeyNode.publicKeyBase58 = this.publicKey;
    return publicKeyNode;
  }

  async addEncryptedPrivateKey(keyNode) {
    if(this.passphrase !== null) {
      keyNode.privateKeyJwe = await this.encrypt(
        {privateKeyBase58: this.privateKey},
        this.passphrase
      );
    } else {
      // no passphrase, do not encrypt private key
      keyNode.privateKeyBase58 = this.privateKey;
    }
    return keyNode;
  }

  /**
   * @param privateKey
   * @param password
   *
   * @returns {Promise<JWE>}
   */
  async encrypt(privateKey, password) {
    const keySize = 32;
    const salt = forge.random.getBytesSync(32);
    const iterations = 4096;
    const key = await LDKeyPair.pbkdf2(password, salt, iterations, keySize);

    const jweHeader = {
      alg: 'PBES2-A128GCMKW',
      enc: 'A128GCMKW',
      jwk: {
        kty: 'PBKDF2',
        s: didUtil.encodeBase64Url(salt, {forge}),
        c: iterations
      }
    };

    // FIXME: this probably needs to be cleaned up/made more standard

    const iv = forge.random.getBytesSync(12);
    const cipher = forge.cipher.createCipher('AES-GCM', key);
    cipher.start({iv});
    cipher.update(forge.util.createBuffer(JSON.stringify(privateKey)));
    cipher.finish();
    const encrypted = cipher.output.getBytes();
    const tag = cipher.mode.tag.getBytes();

    const jwe = {
      unprotected: jweHeader,
      iv: didUtil.encodeBase64Url(iv, {forge}),
      ciphertext: didUtil.encodeBase64Url(encrypted, {forge}),
      tag: didUtil.encodeBase64Url(tag, {forge})
    };

    return jwe;
  }

  async decrypt(jwe, password) {
    // FIXME: check header, implement according to JWE standard
    const keySize = 32;
    const {c: iterations} = jwe.unprotected.jwk;
    let {s: salt} = jwe.unprotected.jwk;
    salt = didUtil.decodeBase64Url(salt, {forge});
    const key = await LDKeyPair.pbkdf2(password, salt, iterations, keySize);

    const iv = didUtil.decodeBase64Url(jwe.iv, {forge});
    const tag = didUtil.decodeBase64Url(jwe.tag, {forge});
    const decipher = forge.cipher.createDecipher('AES-GCM', key);
    decipher.start({iv, tag});
    decipher.update(didUtil.decodeBase64Url(jwe.ciphertext, {forge}));
    const pass = decipher.finish();
    if(!pass) {
      throw new Error('Invalid password.');
    }

    const privateKey = JSON.parse(decipher.output.getBytes());
    return privateKey;
  }

  /**
   * Generates and returns a Multiformat encoded ed25519 public key fingerprint
   * (for use with cryptonyms, for example).
   *
   * @see https://github.com/multiformats/multicodec
   *
   * @returns {string}
   */
  fingerprint() {
    const forge = this.injector.use('node-forge');
    const buffer = new forge.util.createBuffer();

    // ed25519 cryptonyms are multiformat encoded values, specifically:
    // (multicodec 0x30 + ed25519-pub 0xed + key bytes)
    const pubkeyBytes = forge.util.binary.base58.decode(this.publicKey);
    buffer.putBytes(forge.util.hexToBytes('30ed'));
    buffer.putBytes(pubkeyBytes.toString('binary'));

    return forge.util.binary.base58.encode(buffer);
  }

  /**
   * Tests whether the fingerprint was generated from a given key pair.
   *
   * @param fingerprint {string}
   *
   * @returns {boolean}
   */
  verifyFingerprint(fingerprint) {
    const forge = this.injector.use('node-forge');
    const fingerprintBuffer = forge.util.binary.base58.decode(fingerprint);
    const publicKeyBuffer = forge.util.binary.base58.decode(this.publicKey);

    // validate the first two multiformat bytes, 0x30 and 0xed
    return fingerprintBuffer.slice(0, 2).toString('hex') === '30ed' &&
      publicKeyBuffer.equals(fingerprintBuffer.slice(2));
  }
}

class RSAKeyPair extends LDKeyPair {
  /**
   * @param options
   * @param [options.keyBits]
   * @param [options.exponent]
   * @param [options.injector]
   *
   * @returns {Promise<RSAKeyPair>}
   */
  static async generate(options) {
    const keyBits = options.keyBits || DEFAULT_RSA_KEY_BITS;
    const exponent = options.exponent || DEFAULT_RSA_EXPONENT;

    if(options.injector.env.nodejs) {
      const ursa = require('ursa');
      const keyPair = ursa.generatePrivateKey(keyBits, exponent);
      return new RSAKeyPair({
        privateKey: forge.pki.privateKeyFromPem(keyPair.toPrivatePem()),
        publicKey: forge.pki.publicKeyFromPem(keyPair.toPublicPem()),
        ...options
      });
    }

    // Generate for browser
    return new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair(
        {bits: keyBits, e: exponent},
        (err, keyPair) => {
          if(err) {
            return reject(err);
          }
          resolve(new RSAKeyPair({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            ...options
          }));
        });
    });
  }

  static async from(data, options) {
    const keys = new RSAKeyPair({
      publicKey: forge.pki.publicKeyFromPem(data.publicKeyPem),
      privateKey: forge.pki.privateKeyFromPem(data.privateKeyPem),
      id: data.id,
      keyType: data.keyType,
      ...options
    });

    return keys;
  }

  async export() {
    const keyNode = {
      id: this.id,
      keyType: this.keyType
    };

    this.addEncodedPublicKey(keyNode);
    this.addEncryptedPrivateKey(keyNode);

    return keyNode;
  }

  addEncodedPublicKey(publicKeyNode) {
    publicKeyNode.publicKeyPem = forge.pki.publicKeyToPem(this.publicKey);
    return publicKeyNode;
  }

  async addEncryptedPrivateKey(keyNode) {
    if(this.passphrase !== null) {
      keyNode.privateKeyPem = forge.pki.encryptRsaPrivateKey(
        this.privateKey, this.passphrase, {algorithm: 'aes256'});
    } else {
      // no passphrase, do not encrypt private key
      keyNode.privateKeyPem = forge.pki.privateKeyToPem(this.privateKey);
    }
    return keyNode;
  }

  /**
   * Generates and returns a Multiformat encoded RSA public key fingerprint
   * (for use with cryptonyms, for example).
   *
   * @returns {string}
   */
  fingerprint() {
    const forge = this.injector.use('node-forge');
    const buffer = new forge.util.createBuffer();

    // use SubjectPublicKeyInfo fingerprint
    const fingerprintBuffer = forge.pki.getPublicKeyFingerprint(
      this.publicKey, {md: forge.md.sha256.create()});
    // RSA cryptonyms are multiformat encoded values, specifically they are:
    // (multicodec 0x30 + rsa-pub-fingerprint 0x5a + multihash 0x31 +
    //  sha2-256 0x12 + 32 byte value 0x20)
    buffer.putBytes(forge.util.hexToBytes('305a311220'));
    buffer.putBytes(fingerprintBuffer.bytes());

    return forge.util.binary.base58.encode(buffer);
  }
}

module.exports = {
  LDKeyPair,
  Ed25519KeyPair,
  RSAKeyPair
};
