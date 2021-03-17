/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {parseDid} from './did-io.js';

export class MultiResolver {
  constructor(options = {}) {
    this.methods = options.methods || {};
  }

  use(methodName, driver) {
    this.methods[methodName] = driver;
  }

  async get({did, ...options} = {}) {
    const method = this._methodForDid(did);
    return method.get({did, ...options});
  }

  /**
   * @param {object} options - Options hashmap.
   * @param {object} options.didDocument - DID Document to update.
   * @param {object} [options.updateOptions] - Options to pass to the update
   *   operations.
   *
   * @returns {Promise<object>} - Returns results of the update operation.
   */
  async update({didDocument = {}, ...updateOptions} = {}) {
    const method = this._methodForDid(didDocument.did);
    return method.update(updateOptions);
  }

  /**
   * Registers a DID Document, method-specific.
   *
   * TODO: Not sure if this is top level / universal?
   *
   * @param {object} options - Options hashmap.
   * @param {object} options.didDocument - DID Document to register.
   * @param {object} [options.registerOptions] - Options to pass to the register
   *   operations.
   *
   * @returns {Promise<object>} - Returns results of the registration operation.
   */
  async register({didDocument = {}, ...registerOptions} = {}) {
    const method = this._methodForDid(didDocument.did);
    return method.register(registerOptions);
  }

  /**
   * @param {string} did - DID uri.
   *
   * @returns {object} - DID Method driver.
   * @private
   */
  _methodForDid(did) {
    const {prefix} = parseDid(did);
    const method = this.methods[prefix];
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}
