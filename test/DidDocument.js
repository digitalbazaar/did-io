/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
const chai = require('chai');
chai.should();

const {expect} = chai;

const {DidDocument} = require('../src/main');



describe('DidDocument', () => {

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
