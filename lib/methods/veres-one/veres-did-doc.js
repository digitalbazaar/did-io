/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Constants = require('./constants');
const uuid = require('uuid/v4');

class VeresOneDidDoc {
  constructor(options = {}) {
    this.didType = options.didType || 'nym';
    this.keyType = options.keyType;
    this.doc = options.doc || {'@context': Constants.VERES_ONE_V1_CONTEXT};
    this.id = this.doc.id;
  }

  init(env) {
    this.initId(env);
    this.initSuites();
  }

  initId(env = 'dev') {
    if(this.didType === 'uuid') {
      const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';
      this.id = (prefix + 'uuid:' + uuid()).replace(/-/g, '');
    }

    this.doc.id = this.id;
  }

  initSuites() {
    this.initAuthenticationSuite();
    this.initCapabilitySuite('grant');
    this.initCapabilitySuite('invoke');
  }

  initAuthenticationSuite() {}

  initCapabilitySuite(suiteType) {}

  toJSON() {
    return this.doc;
  }
}

module.exports = VeresOneDidDoc;
