/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {VERIFICATION_RELATIONSHIPS} from './constants.js';

/**
 * Tests whether this DID Document contains a verification relationship
 * between the subject and a method id, for a given purpose.
 *
 * @example
 * didDocument.approvesMethodFor({
 *   methodId: 'did:ex:1234#abcd', purpose: 'authentication'
 * });
 * // -> true
 * @example
 * didDocument.approvesMethodFor({
 *   methodId: 'did:ex:1234#abcd', purpose: 'assertionMethod'
 * });
 * // -> false
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 * @param {string} options.methodId - Verification method id (a uri).
 * @param {string} options.purpose - E.g. 'authentication', etc.
 *
 * @returns {boolean} Returns whether a method id is authorized for purpose.
 */
export function approvesMethodFor({doc, methodId, purpose}) {
  if(!(methodId && purpose)) {
    throw new Error('A method id and purpose is required.');
  }
  const method = _methodById({doc, methodId});
  if(!method) {
    return false;
  }
  const methods = doc[purpose] || [];
  return !!methods.find(method => {
    return (typeof method === 'string' && method === methodId) ||
      (typeof method === 'object' && method.id === methodId);
  });
}

/**
 * Initializes the DID Document's keys/proof methods.
 *
 * @example
 * didDocument.id = 'did:ex:123';
 * const {keyPairs} = await initKeys({
 *   cryptoLd,
 *   keyMap: {
 *     capabilityInvocation: someExistingKey,
 *     authentication: 'Ed25519VerificationKey2020',
 *     assertionMethod: 'Ed25519VerificationKey2020',
 *     keyAgreement: 'X25519KeyAgreementKey2019'
 *   }
 * });.
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 * @typedef {object} CryptoLD
 * @param {CryptoLD} [options.cryptoLd] - CryptoLD driver instance,
 *   initialized with the key types this DID Document intends to support.
 * @param {object} [options.keyMap] - Map of keys (or key types) by purpose.
 *
 * @returns {Promise<{keyPairs: object}>} A hashmap of public/private key
 *   pairs, by key id.
 */
export async function initKeys({doc, cryptoLd, keyMap = {}} = {}) {
  if(!doc.id) {
    throw new TypeError(
      'DID Document "id" property is required to initialize keys.');
  }

  const keyPairs = {};

  // Set the defaults for the created keys (if needed)
  const options = {controller: doc.id};

  for(const purpose in keyMap) {
    if(!VERIFICATION_RELATIONSHIPS.has(purpose)) {
      throw new Error(`Unsupported key purpose: "${purpose}".`);
    }

    let key;
    if(typeof keyMap[purpose] === 'string') {
      if(!cryptoLd) {
        throw new Error('Please provide an initialized CryptoLD instance.');
      }
      key = await cryptoLd.generate({type: keyMap[purpose], ...options});
    } else {
      // An existing key has been provided
      key = keyMap[purpose];
    }

    this[purpose] = [key.export({publicKey: true})];
    keyPairs[key.id] = key;
  }

  return {keyPairs};
}

/**
 * Finds a verification method for a given methodId or purpose.
 *
 * If a method id is given, returns the object for that method (for example,
 * returns the public key definition for that id).
 *
 * If a purpose (verification relationship) is given, returns the first
 * available verification method for that purpose.
 *
 * If no method is found (for the given id or purpose), returns undefined.
 *
 * @example
 * findVerificationMethod({doc, methodId: 'did:ex:123#abcd'});
 * // ->
 * {
 *   id: 'did:ex:123#abcd',
 *   controller: 'did:ex:123',
 *   type: 'Ed25519VerificationKey2020',
 *   publicKeyMultibase: '...'
 * }
 * @example
 * didDocument.findVerificationMethod({doc, purpose: 'authentication'});
 * // ->
 * {
 *   id: 'did:ex:123#abcd',
 *   controller: 'did:ex:123',
 *   type: 'Ed25519VerificationKey2020',
 *   publicKeyMultibase: '...'
 * }
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 *
 * One of the following is required.
 * @param {string} [options.methodId] - Verification method id.
 * @param {string} [options.purpose] - Method purpose (verification
 *   relationship).
 *
 * @returns {object} Returns the verification method, or undefined if not found.
 */
export function findVerificationMethod({doc, methodId, purpose} = {}) {
  if(!doc) {
    throw new TypeError('A DID Document is required.');
  }
  if(!(methodId || purpose)) {
    throw new TypeError('A method id or purpose is required.');
  }

  if(methodId) {
    return _methodById({doc, methodId});
  }

  // Id not given, find the first method by purpose
  const [method] = doc[purpose] || [];
  if(method && typeof method === 'string') {
    // This is a reference, not the full method, attempt to find it
    return _methodById({doc, methodId: method});
  }

  return method;
}

/**
 * Finds a verification method for a given id and returns it.
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 * @param {string} options.methodId - Verification method id.
 *
 * @returns {object} Returns the verification method.
 */
export function _methodById({doc, methodId}) {
  let result;

  // First, check the 'verificationMethod' bucket, see if it's listed there
  if(doc.verificationMethod) {
    result = doc.verificationMethod.find(method => method.id === methodId);
  }

  for(const purpose of VERIFICATION_RELATIONSHIPS) {
    const methods = doc[purpose] || [];
    // Iterate through each verification method in 'authentication', etc.
    for(const method of methods) {
      // Only return it if the method is defined, not referenced
      if(typeof method === 'object' && method.id === methodId) {
        result = method;
        break;
      }
    }
    if(result) {
      return result;
    }
  }
}

/**
 * Parses the DID into various component (currently, only cares about prefix).
 *
 * @example
 * parseDid({did: 'did:v1:test:nym'});
 * // -> {prefix: 'v1'}
 *
 * @param {string} did - DID uri.
 *
 * @returns {{prefix: string}} Returns the method prefix (without `did:`).
 */
export function parseDid({did}) {
  if(!did) {
    throw new TypeError('DID cannot be empty.');
  }

  const prefix = did.split(':').slice(1, 2).join(':');

  return {prefix};
}
