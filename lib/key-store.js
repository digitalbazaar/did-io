/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Injector = require('./Injector');
const didUtil = require('./util');
const MockStore = require('./mock-store');

class KeyStore {
  constructor(options = {}) {
    this.injector = options.injector || new Injector();
    this.backend = options.backend || new MockStore();
  }

  async get(keyId) {
    return this.backend.get(keyId);
  }

  async put(keyId, key) {
    return this.backend.put(keyId, key);
  }

  async remove(keyId) {
    return this.backend.remove(keyId);
  }

  async list() {
    return this.backend.list();
  }

  /**
   * Creates a cryptonym DID from a public key with encoding `pem`, `base58`,
   * or `forge` (forge is supported privately/internally only).
   *
   * TODO: This should probably be in the veres-one method code
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

  generateEd25519KeyPair() {
    // currently node only
    if(!this.injector.env.nodejs) {
      throw new Error(
        '"Ed25519VerificationKey2018" is not supported on this platform yet.');
    }
    const bs58 = require('bs58');
    const chloride = require('chloride');
    const keyPair = chloride.crypto_sign_keypair();
    return {
      publicKey: bs58.encode(keyPair.publicKey),
      privateKey: bs58.encode(keyPair.secretKey)
    };
  }

  async generateRsaKeyPair(keyBits = 2048, exponent = 0x10001) {
    const forge = this.injector.use('node-forge');
    // const forge = require('node-forge');

    if(this.injector.env.nodejs) {
      const ursa = require('ursa');
      const keyPair = ursa.generatePrivateKey(keyBits, exponent);
      return Promise.resolve({
        privateKey: forge.pki.privateKeyFromPem(keyPair.toPrivatePem()),
        publicKey: forge.pki.publicKeyFromPem(keyPair.toPublicPem())
      });
    }

    // Generate for browser
    return new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({bits: keyBits, e: exponent},
        (err, keyPair) => {
          if(err) {
            return reject(err);
          }
          resolve(keyPair);
        });
    });
  }

  async encrypt(privateKey, password) {
    const forge = this.injector.use('node-forge');

    const keySize = 32;
    const salt = forge.random.getBytesSync(32);
    const iterations = 4096;
    const key = await this.pbkdf2(password, salt, iterations, keySize);

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
    const forge = this.injector.use('forge');

    // FIXME: check header, implement according to JWE standard

    const keySize = 32;
    let {s: salt, c: iterations} = jwe.unprotected.jwk;
    salt = didUtil.decodeBase64Url(salt, {forge});
    const key = await this.pbkdf2(password, salt, iterations, keySize);

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

  pbkdf2(password, salt, iterations, keySize) {
    const forge = this.injector.use('node-forge');
    return new Promise((resolve, reject) => {
      forge.pkcs5.pbkdf2(password, salt, iterations, keySize, (err, key) =>
        err ? reject(err) : resolve(key));
    });
  }

  addEncodedEd25519PublicKey(publicKeyNode, publicKey) {
    publicKeyNode.publicKeyBase58 = publicKey;
    return publicKeyNode;
  }

  async addEncryptedEd25519PrivateKey(privateKeyNode, privateKey, passphrase) {
    if(passphrase !== null) {
      privateKeyNode.jwe =
        await this.encrypt({privateKeyBase58: privateKey}, passphrase);
    } else {
      // no passphrase, do not encrypt private key
      privateKeyNode.privateKeyBase58 = privateKey;
    }
    return privateKeyNode;
  }

  addEncodedRsaPublicKey(publicKeyNode, publicKey) {
    const forge = this.injector.use('forge');
    publicKeyNode.publicKeyPem = forge.pki.publicKeyToPem(publicKey);
    return publicKeyNode;
  }

  async addEncryptedRsaPrivateKey(privateKeyNode, privateKey, passphrase) {
    const forge = this.injector.use('forge');
    if(passphrase !== null) {
      privateKeyNode.privateKeyPem = forge.pki.encryptRsaPrivateKey(
        privateKey, passphrase, {algorithm: 'aes256'});
    } else {
      // no passphrase, do not encrypt private key
      privateKeyNode.privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    }
    return privateKeyNode;
  }
}

module.exports = KeyStore;
