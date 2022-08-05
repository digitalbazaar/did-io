/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * This function comes from the did-test-suite.
 *
 * @see https://github.com/w3c/did-test-suite/
 *
 * @param {object} options - Options to use.
 * @param {string} options.did - A prospective did.
 *
 * @returns {boolean} - Returns true or false.
*/
function _isValidDid({did}) {
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
 * @param {string} options.didUrl - A prospective didUrl.
 *
 * @returns {boolean} - Returns true or false.
*/
function _isValidDidUrl({didUrl}) {
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
