/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const VeresOneClient = require('./client');

class VeresOne {
  constructor(options = {}) {
    this.injector = options.injector;
    this.ledger = 'veres';
    this.client = options.client || new VeresOneClient();
  }

  /**
   * Fetches a DID Document for a given DID.
   * @param did {string}
   * @param [hostname] {string} Optional hostname of ledger (falls back to the
   *   default hostname for a particular mode
   *
   * @param options {object}
   * @param [options.mode] {string} One of 'dev'/'test'/'live'
   *
   * @returns {Promise<object>} Resolves to DID Document Fetch Result
   */
  async get(did, hostname, options) {
    return this.client.get(did, hostname, options);
  }

  async generate() {}

  async register() {}

  async update() {}
}

module.exports = VeresOne;
