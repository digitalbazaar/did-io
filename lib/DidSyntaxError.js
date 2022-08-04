/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Error for throwing did syntax related errors.
 *
 * @param {string} message - An error message.
 * @param {string} code - A did core error.
 *
 */
class DidSyntaxError extends SyntaxError {
  constructor(message, code) {
    super(message);
    this.name = 'DidSyntaxError';
    this.code = code;
  }
}
