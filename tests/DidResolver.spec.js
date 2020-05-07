const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const {DidResolver} = require('../src/');

describe('parseDid', () => {
  it('should return main did method identifier', () => {
    const {prefix} = DidResolver.parseDid('did:v1:test:nym:abcd');
    expect(prefix).to.equal('v1');
  });
});

describe('didIo resolver instance', () => {
  const {didIo} = require('../src/');

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

