/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {isDidUrl} from './did-io.js';
import {DidResolverError} from './DidResolverError.js';

/**
 * Determines if a did contains url characters and
 * then validates either the didUrl or did.
 *
 * @param {object} options - Options to use.
 * @param {string} options.did - A did.
 *
 * @throws {DidResolverError} Throws if did is invalid.
 *
 * @returns {undefined} Just returns on success.
 */
export function validateDid({did}) {
  if(!did) {
    throw new TypeError('A string "did" or "url" parameter is required.');
  }
  if(isDidUrl({did})) {
    if(!isValidDidUrl({didUrl: did})) {
      throw new DidResolverError({
        message: `Invalid did url ${did}`,
        code: 'invalidDidUrl'
      });
    }
    return;
  }
  if(!isValidDid({did})) {
    throw new DidResolverError({
      message: `Invalid did ${did}`,
      code: 'invalidDid'
    });
  }
}

/**
 * This function comes from the did-test-suite.
 *
 * @see https://github.com/w3c/did-test-suite/
 *
 * @param {object} options - Options to use.
 * @param {string} options.did - A prospective DID.
 *
 * @returns {boolean} - Returns true or false.
*/
export function isValidDid({did}) {
  const didRegex1 = new RegExp('^did:(?<method_name>[a-z0-9]+):' +
  '(?<method_specific_id>([a-zA-Z0-9\\.\\-_]|%[0-9a-fA-F]{2}|:)+$)');
  const didRegex2 = /:$/;
  return didRegex1.test(did) && !didRegex2.test(did);
}

/**
 * This function comes from the did-test-suite.
 *
 * @see https://github.com/w3c/did-test-suite/
 *
 * @param {object} options - Options to use.
 * @param {string} options.didUrl - A prospective DID URL.
 *
 * @returns {boolean} - Returns true or false.
*/
export function isValidDidUrl({didUrl}) {
  const pchar = '[a-zA-Z0-9\\-\\._~]|%[0-9a-fA-F]{2}|[!$&\'()*+,;=:@]';
  const didUrlPattern =
      '^' +
      'did:' +
      '([a-z0-9]+)' + // method_name
      '(:' + // method-specific-id
          '([a-zA-Z0-9\\.\\-_]|%[0-9a-fA-F]{2})+' +
      ')+' +
      '((/(' + pchar + ')+)+)?' + // path-abempty
      '(\\?(' + pchar + '|/|\\?)+)?' + // [ "?" query ]
      '(#(' + pchar + '|/|\\?)+)?' + // [ "#" fragment ]
      '$'
      ;
  return new RegExp(didUrlPattern).test(didUrl);
}
