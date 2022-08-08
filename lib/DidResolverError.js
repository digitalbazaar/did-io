/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Error for throwing did syntax related errors.
 *
 * @param {object} options - Options to use.
 * @param {string} options.message - An error message.
 * @param {string} options.code - A did core error.
 * @param {object} options.params - Params to be passed to the base Error Class.
 *
 */
export class DidResolverError extends Error {
  constructor({message, code, params}) {
    super(message, params);
    this.name = 'DidResolverError';
    this.code = code;
  }
}
