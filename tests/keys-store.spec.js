'use strict';

const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const KeyStore = require('../lib/key-store');

describe('ld-signatures keys', () => {
  const keys = new KeyStore();

  describe('generateEd25519KeyPair', () => {
    it('should generate a key pair', () => {
      const keyPair = keys.generateEd25519KeyPair({});
      expect(keyPair).to.have.property('publicKey');
      expect(keyPair).to.have.property('privateKey');
    });
  });

  describe('generateRsaKeyPair', () => {
    it('should generate a key pair', async() => {
      const keyPair = await keys.generateRsaKeyPair();
      expect(keyPair).to.have.property('publicKey');
      expect(keyPair).to.have.property('privateKey');
    });
  });

  describe('encrypt/decrypt', () => {
    it.skip('should do a roundtrip encrypt/decrypt', async() => {
      const {privateKey} = await keys.generateRsaKeyPair();
      const passphrase = 'test';
      const jwe = await keys.encrypt(privateKey, passphrase);

      expect(jwe.unprotected.jwk.kty).to.equal('PBKDF2');

      const decryptedKey = await keys.decrypt(jwe, passphrase);

      expect(decryptedKey).to.equal(privateKey);
    });
  });
});
