'use strict';

const {promisify} = require('util');
const glob = promisify(require('glob'));
const path = require('path');

const {Store} = require('fs-json-store');

class JSONStore {
  /**
   * @param [options={}]
   */
  constructor(options = {}) {
    this.dir = options.dir;
    this.extension = options.extension || '.json';
  }

  storeFor(id) {
    return new Store({file: path.join(this.dir, id + this.extension)});
  }

  async get(id) {
    return this.storeFor(id).read();
  }

  async put(id, data) {
    return this.storeFor(id).write(data);
  }

  async remove(id) {
    return this.storeFor(id).remove();
  }

  async allDocs() {
    return glob(path.join(this.dir, '*' + this.extension));
  }
}

module.exports = JSONStore;
