/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import chai from 'chai';
import {testDid} from './helpers.js';
import {isValidDid, isValidDidUrl} from '../lib/validators.js';
import {DidResolverError} from '../lib/DidResolverError.js';
import {
  typeErrors,
  invalidDids,
  invalidDidSyntax,
  invalidDidUrls,
  validDids,
  validDidUrls,
} from './mock.data.js';

const should = chai.should();

describe('validateDid', () => {
  describe('should not throw', () => {
    const inputs = new Set([...validDids, ...validDidUrls]);
    for(const input of inputs) {
      it(`should validate ${input}`, async () => {
        const error = testDid(input);
        should.not.exist(error, `Expected no error for did ${input}`);
      });
    }
  });
  describe('should throw `TypeError`', () => {
    for(const input of typeErrors) {
      it(`should not validate ${input}`, async () => {
        const error = testDid(input);
        should.exist(error, `Expected error for did ${input}`);
        error.should.be.instanceof(
          TypeError,
          `Expected a TypeError for ${input}`
        );
      });
    }
  });
  describe('should throw `invalidDid`', () => {
    const inputs = [...invalidDidSyntax, 'did:key:z4345345:'];
    for(const input of inputs) {
      it(`should not validate ${input}`, async () => {
        const error = testDid(input);
        should.exist(error, `Expected error for did ${input}`);
        error.should.be.instanceof(
          DidResolverError,
          `Expected a DidResolverError for ${input}`
        );
        error.code.should.equal(
          'invalidDid',
          `Expected ${input} to be an invalid did.`
        );
      });
    }
  });

});

describe('isValidDidUrl', () => {
  for(const validDidUrl of validDidUrls) {
    it(`should validate ${validDidUrl}`, async () => {
      const result = isValidDidUrl({didUrl: validDidUrl});
      should.exist(result, `Expected result for ${validDidUrl} to exist.`);
      result.should.be.a(
        'boolean', 'Expected isValidDidUrl to return a boolean');
      result.should.equal(true, `Expected ${validDidUrl} to validate`);
    });
  }
  for(const invalidDidUrl of invalidDidUrls) {
    it(`should not validate ${invalidDidUrl}`, async () => {
      const result = isValidDidUrl({didUrl: invalidDidUrl});
      should.exist(result, `Expected result for ${invalidDidUrl} to exist.`);
      result.should.be.a(
        'boolean', 'Expected isValidDidUrl to return a boolean');
      result.should.equal(false, `Expected ${invalidDidUrl} to not validate`);
    });
  }
});

describe('isValidDid', () => {
  for(const validDid of validDids) {
    it(`should validate ${validDid}`, async () => {
      const result = isValidDid({did: validDid});
      should.exist(result, `Expected result for ${validDid} to exist.`);
      result.should.be.a('boolean', 'Expected isValidDid to return a boolean');
      result.should.equal(true, `Expected ${validDid} to validate`);
    });
  }
  for(const invalidDid of invalidDids) {
    it(`should not validate ${invalidDid}`, async () => {
      const result = isValidDid({did: invalidDid});
      should.exist(result, `Expected result for ${invalidDid} to exist.`);
      result.should.be.a('boolean', 'Expected isValidDid to return a boolean');
      result.should.equal(false, `Expected ${invalidDid} to not validate`);
    });
  }
});
