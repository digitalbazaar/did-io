/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
const chai = require('chai');
chai.should();

const {expect} = chai;

const {DidDocument} = require('../src/main');

const MOCK_KEY = {
  id: 'did:ex:123#abcd',
  controller: 'did:ex:123',
  type: 'Ed25519VerificationKey2020',
  publicKeyMultibase: '...'
};

describe('DidDocument', () => {
  describe('constructor', () => {
    it('should error if no id is given', async () => {
      let error;
      try {
        new DidDocument();
      } catch(e) {
        error = e;
      }

      expect(error.message).to.equal('Id is required.');
    });
  });

  describe('findVerificationMethod', () => {
    const did = 'did:ex:123';
    let key;

    beforeEach(async () => {
      key = {...MOCK_KEY};
    });

    it('should return undefined if key is not found by id', async () => {
      const doc = new DidDocument({
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      });

      const result = doc.findVerificationMethod({id: 'invalid key id'});
      expect(result).to.be.undefined;
    });

    it('should return undefined if key is not found by purpose', async () => {
      const doc = new DidDocument({
        id: did,
        authentication: [key],
        assertionMethod: []
      });

      expect(doc.findVerificationMethod({purpose: 'assertionMethod'}))
        .to.be.undefined;
      expect(doc.findVerificationMethod({purpose: 'capabilityInvocation'}))
        .to.be.undefined;
    });

    it('should find by id in verificationMethod', async () => {
      const doc = new DidDocument({
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      });

      const result = doc.findVerificationMethod({id: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by id if defined in purpose', async () => {
      const doc = new DidDocument({
        id: did,
        authentication: [key]
      });

      const result = doc.findVerificationMethod({id: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by id if referenced', async () => {
      const doc = new DidDocument({
        id: did,
        authentication: [key.id],
        assertionMethod: [key]
      });

      const result = doc.findVerificationMethod({id: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose in verificationMethod', async () => {
      const doc = new DidDocument({
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      });

      const result = doc.findVerificationMethod({purpose: 'authentication'});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose if defined in purpose', async () => {
      const doc = new DidDocument({
        id: did,
        authentication: [key]
      });

      const result = doc.findVerificationMethod({purpose: 'authentication'});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose if referenced', async () => {
      const doc = new DidDocument({
        id: did,
        authentication: [key.id],
        assertionMethod: [key]
      });

      const result = doc.findVerificationMethod({purpose: 'authentication'});
      expect(result).to.eql(MOCK_KEY);
    });
  });

  describe('approvesMethodFor', () => {
    const did = 'did:ex:123';
    let key;

    beforeEach(async () => {
      key = {...MOCK_KEY};
    });

    it('should return false if method not in document', async () => {
      const doc = new DidDocument({
        id: did
      });

      const result = doc.approvesMethodFor({
        methodId: key.id, purpose: 'authentication'
      });
      expect(result).to.be.false;
    });

    it('should return false if method not approved', async () => {
      const doc = new DidDocument({
        id: did,
        verificationMethod: [key]
      });

      expect(doc.approvesMethodFor({
        methodId: key.id, purpose: 'authentication'
      })).to.be.false;

      doc.assertionMethod = [key.id];
      expect(doc.approvesMethodFor({
        methodId: key.id, purpose: 'authentication'
      })).to.be.false;
    });

    it('should return true if method is approved (referenced)', async () => {
      const doc = new DidDocument({
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      });

      expect(doc.approvesMethodFor({
        methodId: key.id, purpose: 'authentication'
      })).to.be.true;
    });
  });
});
