/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import chai from 'chai';
chai.should();
const {expect} = chai;

import {
  findVerificationMethod, approvesMethodFor, parseDid
} from '../lib/index.js';

const MOCK_KEY = {
  id: 'did:ex:123#abcd',
  controller: 'did:ex:123',
  type: 'Ed25519VerificationKey2020',
  publicKeyMultibase: '...'
};

describe('parseDid', () => {
  it('should return main did method identifier', async () => {
    const {prefix} = parseDid({did: 'did:v1:test:nym:abcd'});
    expect(prefix).to.equal('v1');
  });
});

describe('didIo utility functions', () => {
  describe('findVerificationMethod', () => {
    const did = 'did:ex:123';
    let key;

    beforeEach(async () => {
      key = {...MOCK_KEY};
    });

    it('should return undefined if key is not found by id', async () => {
      const doc = {
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      };

      const result = findVerificationMethod({doc, methodId: 'a key id'});
      expect(result).to.be.undefined;
    });

    it('should return undefined if key is not found by purpose', async () => {
      const doc = {
        id: did,
        authentication: [key],
        assertionMethod: []
      };

      expect(findVerificationMethod({doc, purpose: 'assertionMethod'}))
        .to.be.undefined;
      expect(findVerificationMethod({doc, purpose: 'capabilityInvocation'}))
        .to.be.undefined;
    });

    it('should find by id in verificationMethod', async () => {
      const doc = {
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      };

      const result = findVerificationMethod({doc, methodId: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by id if defined in purpose', async () => {
      const doc = {
        id: did,
        authentication: [key]
      };

      const result = findVerificationMethod({doc, methodId: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by id if referenced', async () => {
      const doc = {
        id: did,
        authentication: [key.id],
        assertionMethod: [key]
      };

      const result = findVerificationMethod({doc, methodId: key.id});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose in verificationMethod', async () => {
      const doc = {
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      };

      const result = findVerificationMethod({doc, purpose: 'authentication'});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose if defined in purpose', async () => {
      const doc = {
        id: did,
        authentication: [key]
      };

      const result = findVerificationMethod({doc, purpose: 'authentication'});
      expect(result).to.eql(MOCK_KEY);
    });

    it('should find by purpose if referenced', async () => {
      const doc = {
        id: did,
        authentication: [key.id],
        assertionMethod: [key]
      };

      const result = findVerificationMethod({doc, purpose: 'authentication'});
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
      const doc = {
        id: did
      };

      const result = approvesMethodFor({
        doc, methodId: key.id, purpose: 'authentication'
      });
      expect(result).to.be.false;
    });

    it('should return false if method not approved', async () => {
      const doc = {
        id: did,
        verificationMethod: [key]
      };

      expect(approvesMethodFor({
        doc, methodId: key.id, purpose: 'authentication'
      })).to.be.false;

      doc.assertionMethod = [key.id];
      expect(approvesMethodFor({
        doc, methodId: key.id, purpose: 'authentication'
      })).to.be.false;
    });

    it('should return true if method is approved (referenced)', async () => {
      const doc = {
        id: did,
        verificationMethod: [key],
        authentication: [key.id]
      };

      expect(approvesMethodFor({
        doc, methodId: key.id, purpose: 'authentication'
      })).to.be.true;
    });
  });
});

