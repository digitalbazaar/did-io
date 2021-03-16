/*!
 * Copyright (c) 2018-2021 Digital Bazaar, Inc. All rights reserved.
 */
export class DidResolver {
  constructor(options = {}) {
    this.methods = options.methods || {};
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
    const {prefix} = _parseDid(did);
    const method = this.methods[prefix];
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}

/**
 * Parses the DID into various component (currently, only cares about prefix).
 *
 * Usage:
 *
 *   ```
 *   _parseDid('did:v1:test:nym');
 *   // -> 'v1'
 *   ```
 * @param {string} did - DID uri.
 * @returns {{prefix: string}} Returns the method prefix (without `did:`).
 */
export function _parseDid(did) {
  if(!did) {
    throw new TypeError('DID cannot be empty.');
  }

  const prefix = did.split(':').slice(1, 2).join(':');

  return {prefix};
}
