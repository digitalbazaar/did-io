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
    this.secretKey = options.secretKey;
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
      default:
        return RSAKeyPair.generate(options);
    }
  }

  /**
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
      default:
        return RSAKeyPair.from(data, options);
    }
  }

  static async pbkdf2(password, salt, iterations, keySize) {
    return new Promise((resolve, reject) => {
      forge.pkcs5.pbkdf2(password, salt, iterations, keySize, (err, key) =>
        err ? reject(err) : resolve(key));
    });
  }
}

class Ed25519KeyPair extends LDKeyPair {
  static async generate(options) {
    // currently node only
    if(!options.injector.env.nodejs) {
      throw new Error(
        '"Ed25519VerificationKey2018" is not supported on this platform yet.');
    }
    const bs58 = require('bs58');
    const chloride = require('chloride');
    const keyPair = chloride.crypto_sign_keypair();

    const keys = new Ed25519KeyPair({
      publicKey: bs58.encode(keyPair.publicKey),
      secretKey: bs58.encode(keyPair.secretKey),
      ...options
    });

    return Promise.resolve(keys);
  }

  static async from(data, options) {
    const keyPair = new Ed25519KeyPair({
      publicKey: data.publicKeyBase58,
      secretKey: data.secretKeyBase58,
      id: data.id,
      keyType: data.keyType,
      ...options
    });

    return Promise.resolve(keyPair);
  }

  // publicKeyPem, publicKeyJwk, publicKeyHex, publicKeyBase64, publicKeyBase58
  async export() {
    let keyNode = {
      id: this.id,
      keyType: this.keyType,
      publicKeyBase58: this.publicKey
    };

    keyNode = await this.addEncryptedSecretKey(keyNode);

    return keyNode;
  }

  addEncodedPublicKey(publicKeyNode) {
    publicKeyNode.publicKeyBase58 = this.publicKey;
    return publicKeyNode;
  }

  async addEncryptedSecretKey(keyNode) {
    if(this.passphrase !== null) {
      keyNode.secretKeyJwe = await this.encrypt({secretKeyBase58: this.secretKey},
        this.passphrase);
    } else {
      // no passphrase, do not encrypt private key
      keyNode.secretKeyBase58 = this.secretKey;
    }
    return keyNode;
  }

  /**
   * @param secretKey
   * @param password
   *
   * @returns {Promise<JWE>}
   */
  async encrypt(secretKey, password) {
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
    cipher.update(forge.util.createBuffer(JSON.stringify(secretKey)));
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
    let {s: salt, c: iterations} = jwe.unprotected.jwk;
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
      return Promise.resolve(new RSAKeyPair({
        secretKey: forge.pki.privateKeyFromPem(keyPair.toPrivatePem()),
        publicKey: forge.pki.publicKeyFromPem(keyPair.toPublicPem()),
        ...options
      }));
    }

    // Generate for browser
    return new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({bits: keyBits, e: exponent},
        (err, keyPair) => {
          if(err) {
            return reject(err);
          }
          resolve(new RSAKeyPair({
            secretKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            ...options
          }));
        });
    });
  }

  static async from(data, options) {
    const keys = new RSAKeyPair({
      publicKey: forge.pki.publicKeyFromPem(data.publicKeyPem),
      secretKey: forge.pki.privateKeyFromPem(data.secretKeyPem),
      id: data.id,
      keyType: data.keyType,
      ...options
    });

    return Promise.resolve(keys);
  }

  async export() {
    const keyNode = {
      id: this.id,
      keyType: this.keyType
    };

    this.addEncodedPublicKey(keyNode);
    this.addEncryptedSecretKey(keyNode);

    return Promise.resolve(keyNode);
  }

  addEncodedPublicKey(publicKeyNode) {
    publicKeyNode.publicKeyPem = forge.pki.publicKeyToPem(this.publicKey);
    return publicKeyNode;
  }

  async addEncryptedSecretKey(keyNode) {
    if(this.passphrase !== null) {
      keyNode.secretKeyPem = forge.pki.encryptRsaPrivateKey(
        this.secretKey, this.passphrase, {algorithm: 'aes256'});
    } else {
      // no passphrase, do not encrypt private key
      keyNode.secretKeyPem = forge.pki.privateKeyToPem(this.secretKey);
    }
    return keyNode;
  }
}

module.exports = {
  LDKeyPair,
  Ed25519KeyPair,
  RSAKeyPair
};
