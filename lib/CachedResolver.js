/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {parseDid} from './did-io.js';
import {LruCache} from '@digitalbazaar/lru-memoize';

export class CachedResolver {
  constructor({max = 100, ...cacheOptions} = {}) {
    this._cache = new LruCache({max, ...cacheOptions});
    this._methods = new Map();
  }

  use(driver) {
    const methodName = driver.method;
    this._methods.set(methodName, driver);
  }

  /**
   * Gets the DID Document, by selecting a registered driver based on the DID
   * prefix (DID method).
   * Either `did` or `url` param is required.
   *
   * @param {object} options - Options hashmap.
   * @param {string} [options.did] - DID uri.
   * @param {string} [options.url] - Typically, a key ID or other DID-related
   *   url. This is used to improve code readability.
   * @param {object} [options.getOptions] - Options passed through to the
   *   driver's get() operation.
   *
   * @returns {Promise<object>} Resolves with fetched DID Document.
   */
  async get({did, url, ...getOptions} = {}) {
    did = did || url;
    if(!did) {
      throw new TypeError('A string "did" or "url" parameter is required.');
    }

    const method = this._methodForDid(did);

    return this._cache.memoize({
      key: did,
      fn: () => method.get({did, ...getOptions})
    });
  }

  /**
   * @param {string} did - DID uri.
   *
   * @returns {object} - DID Method driver.
   * @private
   */
  _methodForDid(did) {
    const {prefix} = parseDid(did);
    const method = this._methods.get(prefix);
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}
