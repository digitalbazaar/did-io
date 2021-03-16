/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {VERIFICATION_RELATIONSHIPS} from './constants.js';

export class DidResolver {
  constructor(options = {}) {
    this.methods = options.methods || {};
  }

  use(methodName, driver) {
    this.methods[methodName] = driver;
  }

  async get({did, ...options} = {}) {
    const method = this._methodForDid(did);
    return method.get({did, ...options});
  }

  /**
   * @param {object} options
   * @param {DidDocument} options.didDocument
   *
   * @returns {Promise}
   */
  async update(options = {}) {
    const didDocument = options.didDocument || {};
    const method = this._methodForDid(didDocument.did);
    return method.update(options);
  }

  /**
   * Registers a DID Document, method-specific.
   *
   * TODO: Not sure if this is top level / universal?
   */
  async register(options = {}) {
    const didDocument = options.didDocument || {};
    const method = this._methodForDid(didDocument.did);
    return method.register(options);
  }

  _methodForDid(did) {
    const {prefix} = _parseDid(did);
    const method = this.methods[prefix];
    if(!method) {
      throw new Error(`Driver for DID ${did} not found.`);
    }
    return method;
  }
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
 * One of the following is required:
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
 * @param {string} options.id - Verification method id.
 *
 * @returns {object} Returns the verification method.
 */
export function _methodById({doc, methodId}) {
  let result;

  // First, check the 'verificationMethod' bucket, see if it's listed there
  if(doc.verificationMethod) {
    result = doc.verificationMethod.find(method => method.id === methodId);
  }

  for(const purpose of VERIFICATION_RELATIONSHIPS.keys()) {
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
 * Usage:
 *
 *   ```
 *   _parseDid('did:v1:test:nym');
 *   // -> 'v1'
 *   ```
 * @param {string} did - DID uri.
 * @returns {{prefix: string}} Returns the method prefix (without `did:`).
 */
export function _parseDid(did) {
  if(!did) {
    throw new TypeError('DID cannot be empty.');
  }

  const prefix = did.split(':').slice(1, 2).join(':');

  return {prefix};
}
