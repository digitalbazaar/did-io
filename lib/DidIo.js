/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

class DidIo {
  constructor(options = {}) {
    this.methods = options.methods || {};
  }

  static parseDid(did) {
    return {prefix: 'did:v1'};
  }

  use(methodName, driver) {
    this.methods[methodName] = driver;
  }

  async get({did}) {
    const method = this.methodForDid(did);
    return method.get({did});
  }

  async update(options = {}) {
    const did = options.didDocument.did;
    if(!did) {
      throw new Error('...');
    }
    const method = this.methodForDid(did);
    return method.update(options);
  }

  /**
   * Same deal as update()
   */
  async generate() {}

  /**
   * Same deal as update()
   */
  async register() {}

  methodForDid(did) {
    const {prefix} = DidIo.parseDid(did);
    return this.methods[prefix];
  }
}

module.exports = DidIo;
