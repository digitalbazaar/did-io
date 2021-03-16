/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import chai from 'chai';
chai.should();

const {expect} = chai;

import {DidResolver} from '../';
// Exported only for testing
import {_parseDid} from '../src/DidResolver.js';

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

