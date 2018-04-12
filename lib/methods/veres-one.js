/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const DEFAULT_LOCATION = 'ledger';
const DEFAULT_MODE = 'test';

class VeresOne {
  constructor(options = {}) {
    this.injector = options.injector;
    this.ledger = 'veres';
  }
}

module.exports = VeresOne;
