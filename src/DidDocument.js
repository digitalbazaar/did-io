/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import {VERIFICATION_RELATIONSHIPS} from './constants';

export class DidDocument {
  /**
   * @see https://w3c.github.io/did-core/#did-document-properties
   * @param {string} id - Decentralized Identifier (DID) of this document.
   * @param {string} [controller]
   * @param {object[]} [verificationMethod]
   * @param {object[]|string[]} [assertionMethod]
   * @param {object[]|string[]} [authentication]
   * @param {object[]|string[]} [capabilityDelegation]
   * @param {object[]|string[]} [capabilityInvocation]
   * @param {object[]|string[]} [keyAgreement]
   * @param {object[]} [service]
   */
  constructor({
    id, controller, verificationMethod, assertionMethod, authentication,
    capabilityDelegation, capabilityInvocation, keyAgreement, service
  } = {}) {
    if(!id) {
      throw new Error('Id is required.');
    }
    this.id = id; // DID
    this.controller = controller;
    this.verificationMethod = verificationMethod;

    // Proof methods / verification relationships
    this.capabilityInvocation = capabilityInvocation;
    this.authentication = authentication;
    this.assertionMethod = assertionMethod;
    this.capabilityDelegation = capabilityDelegation;
    this.keyAgreement = keyAgreement;

    // Service endpoints
    this.service = service;
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
   * @param {CryptoLD} [options.cryptoLd] - CryptoLD driver instance,
   *   initialized with the key types this DID Document intends to support.
   * @param {object} [keyMap] - Map of keys (or key types) by purpose.
   *
   * @returns {Promise<{keyPairs: object}>} A hashmap of public/private key
   *   pairs, by key id.
   */
  async initKeys({cryptoLd, keyMap = {}} = {}) {
    if(!this.id) {
      throw new Error(
        'DID Document "id" property is required to initialize keys.');
    }

    const keyPairs = {};

    // Set the defaults for the created keys (if needed)
    const options = {controller: this.id};

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
        key = keyMap[purpose]; // Existing key
      }

      this[purpose] = [key.export({publicKey: true})];
      keyPairs[key.id] = key;
    }

    return {keyPairs};
  }

  /**
   * Finds a verification method for a given id or purpose.
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
   * didDocument.findVerificationMethod({id: 'did:ex:123#abcd'});
   * // ->
   * {
   *   id: 'did:ex:123#abcd',
   *   controller: 'did:ex:123',
   *   type: 'Ed25519VerificationKey2020',
   *   publicKeyMultibase: '...'
   * }
   * @example
   * didDocument.findVerificationMethod({purpose: 'authentication'});
   * // ->
   * {
   *   id: 'did:ex:123#abcd',
   *   controller: 'did:ex:123',
   *   type: 'Ed25519VerificationKey2020',
   *   publicKeyMultibase: '...'
   * }
   * @param {object} options - Options hashmap.
   * One of the following is required:
   * @param {string} [options.id] - Verification method id.
   * @param {string} [options.purpose] - Method purpose (verification
   *   relationship).
   *
   * @returns {object}
   */
  findVerificationMethod({id, purpose} = {}) {
    if(!(id || purpose)) {
      throw new Error('A method id or purpose is required.');
    }

    if(id) {
      return this._methodById({id});
    }

    // Id not given, find the first method by purpose
    const [method] = this[purpose] || [];
    if(method && typeof method === 'string') {
      // This is a reference, not the full method, attempt to find it
      return this._methodById({id: method});
    }

    return method;
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
   * @param {string} options.methodId - Verification method id (a uri).
   * @param {string} options.purpose - e.g. 'authentication', etc.
   *
   * @returns {boolean}
   */
  approvesMethodFor({methodId, purpose}) {
    if(!(methodId && purpose)) {
      throw new Error('A method id and purpose is required.');
    }
    const method = this._methodById({id: methodId});
    if(!method) {
      return false;
    }
    const methods = this[purpose] || [];
    return !!methods.find(method => {
      return (typeof method === 'string' && method === methodId) ||
        (typeof method === 'object' && method.id === methodId);
    });
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
  addService({id, type, endpoint} = {}) {
    if(!(id && type && endpoint)) {
      throw new Error('Service id, type and endpoint is required.');
    }
    if(!this.service) {
      this.service = [];
    }

    if(this.findService({id})) {
      throw new Error(`A service with id "${id}" already exists.`);
    }
    this.service.push({id, type, endpoint});
  }

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
  findService({id, type} = {}) {
    if(!(id || type)) {
      throw new Error('A service id or type is required.');
    }
    const services = this.service || [];
    if(id) {
      return services.find(service => service.id === id);
    }
    return services.find(service => service.type === type);
  }

  /**
   * Removes a service endpoint from this did doc.
   * If that service endpoint does not exist in this doc, does nothing.
   *
   * @param {object} options - Options hashmap.
   * @param {string} options.id - Service id (uri).
   */
  removeService({id}) {
    if(!this.service) {
      return;
    }
    this.service = this.service.filter(s => s.id !== id);
  }

  /**
   * Finds a verification method for a given id and returns it.
   *
   * @param {object} options - Options hashmap.
   * @param {string} options.id - Verification method id.
   *
   * @returns {object}
   * @private
   */
  _methodById({id}) {
    let result;

    // First, check the 'verificationMethod' bucket, see if it's listed there
    if(this.verificationMethod) {
      result = this.verificationMethod.find(method => method.id === id);
    }

    for(const purpose of VERIFICATION_RELATIONSHIPS.keys()) {
      const methods = this[purpose] || [];
      // Iterate through each verification method in 'authentication', etc.
      for(const method of methods) {
        // Only return it if the method is defined, not referenced
        if(typeof method === 'object' && method.id === id) {
          result = method;
          break;
        }
      }
      if(result) {
        return result;
      }
    }
  }
}
