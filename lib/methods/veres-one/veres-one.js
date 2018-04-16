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

  async get(did, hostname, options) {
    return this.client.get(did, hostname, options);
  }

  async generate() {}

  async register() {}

  async update() {}
}

module.exports = VeresOne;
