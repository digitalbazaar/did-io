/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import chai from 'chai';
chai.should();
const {expect} = chai;

import {DidResolver} from '../';
// Exported only for testing
import {findVerificationMethod, _parseDid} from '../src/DidResolver.js';

const MOCK_KEY = {
  id: 'did:ex:123#abcd',
  controller: 'did:ex:123',
  type: 'Ed25519VerificationKey2020',
  publicKeyMultibase: '...'
};

describe('_parseDid', () => {
  it('should return main did method identifier', async () => {
    const {prefix} = _parseDid('did:v1:test:nym:abcd');
    expect(prefix).to.equal('v1');
  });
});

describe('didIo resolver instance', () => {
  const didIo = new DidResolver();

  describe('get()', () => {
    it('should error if no DID is passed', async () => {
      let error;
      try {
        await didIo.get();
      } catch(e) {
        error = e;
      }

      expect(error.message).to.equal('DID cannot be empty.');
    });
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
});

