/*!
 * Copyright (c) 2018-2020 Digital Bazaar, Inc. All rights reserved.
 */
export class DidResolver {
  constructor(options = {}) {
    this.methods = options.methods || {};
  }

  /**
   * Parses the DID into various component (currently, only cares about prefix).
   *
   * Usage:
   *
   *   ```
   *   DidResolver.parseDid('did:v1:test:nym');
   *   // -> 'v1'
   *   ```
   * @param did
   * @returns {{prefix: string}}
   */
  static parseDid(did) {
    if(!did) {
      throw new TypeError('DID cannot be empty.');
    }

    const prefix = did.split(':').slice(1, 2).join(':');

    return {prefix};
  }

  use(methodName, driver) {
    this.methods[methodName] = driver;
  }

  async get({did, ...options} = {}) {
    const method = this.methodForDid(did);
    return method.get({did, ...options});
  }

  /**
   * @param {object} options
   * @param {DidDocument} options.didDocument
   *
   * @returns {Promise}
   */
  async update(options = {}) {
    const didDocument = options.didDocument || {};
    const method = this.methodForDid(didDocument.did);
    return method.update(options);
  }

  /**
   * Registers a DID Document, method-specific.
   *
   * TODO: Not sure if this is top level / universal?
   */
  async register(options = {}) {
    const didDocument = options.didDocument || {};
    const method = this.methodForDid(didDocument.did);
    return method.register(options);
  }

  methodForDid(did) {
    const {prefix} = DidResolver.parseDid(did);
    const method = this.methods[prefix];
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}
