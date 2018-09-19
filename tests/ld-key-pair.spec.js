'use strict';

const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const {LDKeyPair, Ed25519KeyPair, RSAKeyPair} = require('../lib/ld-key-pair');

const injector = {env: {nodejs: true}};

describe('LDKeyPair', () => {
  describe('Ed25519KeyPair', () => {
    const keyType = 'Ed25519VerificationKey2018';

    describe('export', () => {
      it('should export id, type and key material', async () => {
        const keyPair = await LDKeyPair.generate({injector, keyType});
        keyPair.id = '#test-id';
        const exported = await keyPair.export();

        expect(exported.id).to.equal('#test-id');
        expect(exported.keyType).to.equal(keyType);
        expect(exported).to.have.property('publicKeyBase58');
        expect(exported).to.have.property('privateKeyBase58');
      });
    });

    describe('static from', () => {
      it('should round-trip load exported keys', async () => {
        const keyPair = await LDKeyPair.generate({injector, keyType});
        keyPair.id = '#test-id';
        const exported = await keyPair.export();
        const imported = await LDKeyPair.from(exported, {injector});

        expect(await imported.export()).to.eql(exported);
      });
    });
  });

  describe('RSAKeyPair', () => {
    const keyType = 'RsaVerificationKey2018';

    describe('export', () => {
      it('should export id, type and key material', async () => {
        const keyPair = await LDKeyPair.generate({injector, keyType});
        keyPair.id = '#test-id';
        const exported = await keyPair.export();

        expect(exported.id).to.equal('#test-id');
        expect(exported.keyType).to.equal(keyType);
        expect(exported).to.have.property('publicKeyPem');
        expect(exported).to.have.property('privateKeyPem');
      });
    });

    describe('static from', () => {
      it('should round-trip load exported keys', async () => {
        const keyPair = await LDKeyPair.generate({injector, keyType});
        keyPair.id = '#test-id';
        const exported = await keyPair.export();
        const imported = await LDKeyPair.from(exported, {injector});

        expect(await imported.export()).to.eql(exported);
      });
    });
  });
});
