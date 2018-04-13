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
    this.config = options.config || require('./veres-one.config');
  }

  /**
   * @param options {object}
   * @param options.mode {string} Request mode ('test', 'live', 'dev' etc)
   * @param [options.hostname] {string|Array<string>} One or more hostnames
   *
   * @throws {Error} If no hostnames are provided and mode is unknown
   *
   * @returns {Array<string>} List of hostnames for given options
   */
  hostnames(options) {
    const location = options.location || DEFAULT_LOCATION;
    const overrides = this.optionHostnames(options);

    let hostnames = [...overrides]; // start with user-provided overrides

    if(['ledger-all', 'all'].includes(location)) {
      // add all the hostnames for a mode
      hostnames = hostnames.concat(this.modeHostnames(options));
    }
    // if location is 'any', 'ledger', 'both', no further action needed

    if(!hostnames.length) {
      hostnames = [this.defaultHostname(options)];
    }

    return Array.from(new Set(hostnames)); // de-duplicate
  }

  /**
   * @param options {object}
   * @param options.mode {string} Request mode ('test', 'live', 'dev' etc)
   *
   * @throws {Error} If mode is unknown
   *
   * @returns {Array<string>} Hostnames for a given mode
   */
  modeHostnames(options) {
    if(options.mode === 'test') {
      return this.config.hostnames.testnet;
    } else {
      return [this.defaultHostname(options)];
    }
  }

  /**
   * @param options {object}
   * @param options.mode {string} Request mode ('test', 'live', 'dev' etc)
   * @param [options.hostname] {string} Override hostname
   *
   * @throws {Error} If no override hostname is provided and mode is unknown,
   *  or if more than one override is provided
   *
   * @returns {string} A single hostname for given options
   */
  singleHostname(options) {
    const overrides = this.optionHostnames(options);
    if(overrides.length > 1) {
      throw new Error('Too many hostnames provided');
    }
    if(overrides.length === 1) {
      return overrides[0];
    }
    return this.defaultHostname(options);
  }

  /**
   * @param options {object}
   * @param [options.hostname] {string|Array<string>} One or more hostnames
   *
   * @returns {Array<string>} List of hostname overrides
   */
  optionHostnames(options) {
    const hostnames = options.hostname || [];
    return Array.isArray(hostnames) ? hostnames : [hostnames];
  }

  /**
   * @param options {object}
   * @param options.mode {string} Request mode ('test', 'live', 'dev' etc)
   *
   * @throws {Error} If mode is unknown
   *
   * @returns {string} Hostname for a given mode
   */
  defaultHostname(options) {
    const mode = options.mode || DEFAULT_MODE;

    switch(mode) {
      case 'dev':
        return 'genesis.veres.one.localhost:42443';
      case 'test':
        return 'genesis.testnet.veres.one';
      case 'live':
        return 'veres.one';
      default:
        throw new Error('Unknown mode');
    }
  }
}

module.exports = VeresOne;
