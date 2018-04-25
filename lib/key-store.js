/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const MockStore = require('./mock-store');

class KeyStore {
  constructor(options = {}) {
    this.backend = options.backend || new MockStore();
  }

  async get(keyId) {
    return this.backend.get(keyId);
  }

  async put(keyId, key) {
    return this.backend.put(keyId, key);
  }

  async remove(keyId) {
    return this.backend.remove(keyId);
  }

  async list() {
    return this.backend.list();
  }
}

module.exports = KeyStore;
