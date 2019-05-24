/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

class DidIo {
  constructor(options = {}) {
    this.methods = options.methods || {};
  }

  /**
   * Parses the DID into various component (currently, only cares about prefix).
   *
   * Usage:
   *
   *   ```
   *   DidIo.parseDid('did:v1:test:nym');
   *   // -> 'did:v1'
   *   ```
   * @param did
   * @returns {{prefix: string}}
   */
  static parseDid(did) {
    if(!did) {
      throw new TypeError('DID cannot be empty.');
    }

    const prefix = did.split(':').slice(0, 2).join(':');

    return {prefix};
  }

  use(methodName, driver) {
    this.methods[methodName] = driver;
  }

  async get({did} = {}) {
    const method = this.methodForDid(did);
    return method.get({did});
  }

  /**
   * @param {object} options
   * @param {DidDocument} options.didDocument
   *
   * @returns {Promise}
   */
  async update(options = {}) {
    const did = options.didDocument.did;
    if(!did) {
      throw new Error('...');
    }
    const method = this.methodForDid(did);
    return method.update(options);
  }

  /**
   * Same deal as update()
   */
  async generate(options = {}) {}

  /**
   * Same deal as update()
   */
  async register(options = {}) {}

  methodForDid(did) {
    const {prefix} = DidIo.parseDid(did);
    const method = this.methods[prefix];
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}

module.exports = DidIo;
