/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Injector = require('./Injector');

class KeyStore {
  constructor(options = {}) {
    this.injector = options.injector || new Injector();
  }

  saveNotes(didDocument, options) {
    // const release = await _lockConfig(options);
    // const config = await _loadConfig(options);
    // const notes = {};
    // if (jsonld.hasValue(config, 'urn:did-client:notes:auto', 'ledger')) {
    //   jsonld.addValue(notes, 'ledger', `${options.ledger}:${options.mode}`);
    // }
    // await release();
    // await _notesAddMany(didDocument.id, notes, options);
  }
}

module.exports = KeyStore;
