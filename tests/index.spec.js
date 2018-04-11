const chai = require('chai');
chai.use(require('dirty-chai'));
chai.should();

const {expect} = chai;

describe('dids', () => {
  it('should exist', () => {
    expect(require('../lib/index')).to.exist();
  });
});
