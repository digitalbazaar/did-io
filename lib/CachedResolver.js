/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {parseDid} from './did-io.js';
import {LruCache} from '@digitalbazaar/lru-memoize';

export class CachedResolver {
  /**
   * @param {object} [options={}] - Options hashmap.
   * @param {number} [options.max=100] - Max number of items in the cache.
   * @param {number} [options.maxAge=5000] - Max age of a cache item, in ms.
   * @param {boolean} [options.updateAgeOnGet=false] - When using time-expiring
   *   entries with `maxAge`, setting this to true will make each entry's
   *   effective time update to the current time whenever it is retrieved from
   *   cache, thereby extending the expiration date of the entry.
   * @param {object} [options.cacheOptions] - Additional `lru-cache` options.
   */
  constructor({max = 100, maxAge = 5000, updateAgeOnGet = false,
    ...cacheOptions} = {}) {
    this._cache = new LruCache({max, maxAge, updateAgeOnGet, ...cacheOptions});
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
   *   url. This is used instead of 'did' to improve code readability.
   * @param {object} [options.args] - Options passed through to the
   *   driver's get() operation.
   *
   * @returns {Promise<object>} Resolves with fetched DID Document.
   */
  async get({did, url, ...args} = {}) {
    did = did || url;
    if(!did) {
      throw new TypeError('A string "did" or "url" parameter is required.');
    }

    const method = this._methodForDid(did);

    return this._cache.memoize({
      key: did,
      fn: () => method.get({did, ...args})
    });
  }

  /**
   * Generates a new DID Document and corresponding keys.
   *
   * @param {object} options - Options hashmap.
   * @param {string} options.method - DID method id (e.g. 'key', 'v1', 'web').
   * @param {object} options.args - Options passed through to the DID driver.
   *
   * @returns {Promise<object>} Resolves with result of individual DID driver's
   *   `generate()` method call.
   */
  async generate({method, ...args}) {
    const driver = this._methods.get(method);
    if(!driver) {
      throw new Error(`Driver for DID method "${method}" not found.`);
    }

    return driver.generate(args);
  }

  /**
   * @param {string} did - DID uri.
   *
   * @returns {object} - DID Method driver.
   * @private
   */
  _methodForDid(did) {
    const {prefix} = parseDid({did});
    const method = this._methods.get(prefix);
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
}
