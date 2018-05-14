/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const os = require('os');
const path = require('path');

const JSONStore = require('./json-store');

/**
 * Models a document store for DID private keys.
 * By default, keys are stored in `~/.dids/keys/`, and are organized by DID.
 * So, DID -> a JSON file with a hashmap of keys by key id.
 *
 * @todo: Decide whether keys should be organized by ledger and/or by mode
 */
class KeyStore {
  /**
   * @param [options={}]
   * @param [options.backend] {Store}
   * @param [options.dir] {string}
   */
  constructor(options = {}) {
    const dir = options.dir || path.join(os.homedir(), '.dids', 'keys');
    const extension = '.jsonld.json';
    this.backend = options.backend || new JSONStore({dir, extension});
  }

  normalizeKey(did) {
    return 'keys-' + did.replace(/:/g, '-');
  }

  /**
   * Gets all keys for a given DID.
   *
   * @param did {string}
   * @returns {Promise<object>}
   */
  async get(did) {
    return this.backend.get(this.normalizeKey(did));
  }

  /**
   * Saves all keys for a given DID.
   *
   * @param did {string}
   * @param keys
   * @returns {Promise}
   */
  async put(did, keys) {
    return this.backend.put(this.normalizeKey(did), keys);
  }

  /**
   * Removes all keys for a given DID.
   *
   * @param did {string}
   * @returns {Promise}
   */
  async remove(did) {
    return this.backend.remove(this.normalizeKey(did));
  }
}

module.exports = KeyStore;
