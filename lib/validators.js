/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {isDidUrl} from './did-io.js';
import {DidResolverError} from './DidResolverError.js';

/**
 * Determines if a DID contains URL characters and
 * then validates either the DID URL or DID.
 *
 * @param {object} options - Options to use.
 * @param {string} options.did - A DID.
 *
 * @throws {DidResolverError} Throws if DID is invalid.
 *
 * @returns {undefined} Returns on success.
 */
export function validateDid({did}) {
  if(!did) {
    throw new TypeError('The parameter "did" is required.');
  }
  if(isDidUrl({did})) {
    if(!isValidDidUrl({didUrl: did})) {
      throw new DidResolverError({
        message: `Invalid DID URL "${did}"`,
        code: 'invalidDidUrl'
      });
    }
    return;
  }
  if(!isValidDid({did})) {
    throw new DidResolverError({
      message: `Invalid DID "${did}"`,
      code: 'invalidDid'
    });
  }
}

/**
 * Validates a DID, but not a DID URL.
 * This function comes from the did-test-suite.
 *
 * @see https://github.com/w3c/did-test-suite/
 *
 * @param {object} options - Options to use.
 * @param {string} options.did - A prospective DID.
 *
 * @returns {boolean} - Returns true if DID is valid.
*/
export function isValidDid({did}) {
  const didRegex1 = new RegExp('^did:(?<method_name>[a-z0-9]+):' +
  '(?<method_specific_id>([a-zA-Z0-9\\.\\-_]|%[0-9a-fA-F]{2}|:)+$)');
  const didRegex2 = /:$/;
  return didRegex1.test(did) && !didRegex2.test(did);
}

/**
 * Validates a DID URL including the fragment and queries.
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
