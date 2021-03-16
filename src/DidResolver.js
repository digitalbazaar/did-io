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
 * Tests whether this DID Document contains a verification relationship
 * between the subject and a method id, for a given purpose.
 *
 * @example
 * didDocument.approvesMethodFor({
 *   methodId: 'did:ex:1234#abcd', purpose: 'authentication'
 * })
 * // ->
 * true
 * @example
 * didDocument.approvesMethodFor({
 *   methodId: 'did:ex:1234#abcd', purpose: 'assertionMethod'
 * })
 * // ->
 * false
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 * @param {string} options.methodId - Verification method id (a uri).
 * @param {string} options.purpose - e.g. 'authentication', etc.
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
 * @example
 * didDocument.id = 'did:ex:123';
 * const {didKeys} = await didDocument.initKeys({
 *   cryptoLd,
 *   keyMap: {
 *     capabilityInvocation: someExistingKey,
 *     authentication: 'Ed25519VerificationKey2020',
 *     assertionMethod: 'Ed25519VerificationKey2020',
 *     keyAgreement: 'X25519KeyAgreementKey2019'
 *   }
 * });
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.doc - DID Document.
 * @typedef {Object} CryptoLD
 * @param {CryptoLD} [options.cryptoLd] - CryptoLD driver instance,
 *   initialized with the key types this DID Document intends to support.
 * @param {object} [keyMap] - Map of keys (or key types) by purpose.
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

/**
 * Adds a service endpoint to this did doc.
 *
 * @param {object} options - Options hashmap.
 * @param {string} options.id - Service id (uri).
 * @param {string} options.type - Service endpoint type
 *   (e.g. 'urn:AgentService').
 * @param {string} options.endpoint - Service endpoint uri
 *   (e.g. 'https://agent.example.com').
 */
// function addService({id, type, endpoint} = {}) {
//   if(!(id && type && endpoint)) {
//     throw new Error('Service id, type and endpoint is required.');
//   }
//   if(!this.service) {
//     this.service = [];
//   }
//
//   if(this.findService({id})) {
//     throw new Error(`A service with id "${id}" already exists.`);
//   }
//   this.service.push({id, type, endpoint});
// }

/**
 * Finds a service endpoint in this did doc, given an id or a type.
 *
 * @param {object} options - Options hashmap.
 *
 * One of the following is required:
 * @param {string} [options.id] - Service id (a uri).
 * @param {string} [options.type] - Service type.
 *
 * @returns {object}
 */
// function findService({id, type} = {}) {
//   if(!(id || type)) {
//     throw new Error('A service id or type is required.');
//   }
//   const services = this.service || [];
//   if(id) {
//     return services.find(service => service.id === id);
//   }
//   return services.find(service => service.type === type);
// }

/**
 * Removes a service endpoint from this did doc.
 * If that service endpoint does not exist in this doc, does nothing.
 *
 * @param {object} options - Options hashmap.
 * @param {string} options.id - Service id (uri).
 */
// function removeService({id}) {
//   if(!this.service) {
//     return;
//   }
//   this.service = this.service.filter(s => s.id !== id);
// }
