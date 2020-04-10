const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const DidIo = require('../lib/DidIo');

describe('parseDid', () => {
  it('should return main did method identifier', () => {
    const {prefix} = DidIo.parseDid('did:v1:test:nym:abcd');
    expect(prefix).to.equal('v1');
  });
});

describe('didIo instance', () => {
  const didIo = require('../lib/');

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

