const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

const {DidIo} = require('../lib/index');

describe('parseDid', () => {
  it('should return main did method identifier', () => {
    const {prefix} = DidIo.parseDid('did:v1:test:nym:abcd');
    expect(prefix).to.equal('v1');
  });
});
