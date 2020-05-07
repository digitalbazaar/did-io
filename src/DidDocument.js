/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {LDKeyPair} = require('crypto-ld');
const {X25519KeyPair} = require('x25519-key-pair');
const constants = require('./constants');
const {DEFAULT_KEY_TYPE, PROOF_PURPOSES} = constants;

class DidDocument {
  constructor({id, capabilityInvocation, authentication, assertionMethod,
    capabilityDelegation, keyAgreement, service} = {}) {
    this.id = id;
    this.capabilityInvocation = capabilityInvocation;
    this.authentication = authentication;
    this.assertionMethod = assertionMethod;
    this.capabilityDelegation = capabilityDelegation;
    this.keyAgreement = keyAgreement;
    this.service = service;
  }

  /**
   * Initializes the DID Document's keys/proof methods. By default, initializes
   * all key purposes; to leave one out, set it to `false`:
   * Usage:
   *
   * ```
   * didDocument.id = 'did:ex:123';
   * // This initializes all key purposes except keyAgreement
   * const {didKeys} = await didDocument.initKeys({
   *   keys: {
   *     capabilityInvocation: someExistingKey,
   *     keyAgreement: false
   *   }
   * });
   * ```
   *
   * @param [keys={}] {object}
   * @param [keyType] {string}
   * @returns {Promise<{didKeys: object}>} Public/private Key hashmap by key id.
   */
  async initKeys({keys = {}, keyType = DEFAULT_KEY_TYPE} = {}) {
    if(!this.id) {
      throw Error('DID Document "id" property is required to initialize keys.');
    }

    let {capabilityInvocation, authentication, assertionMethod,
      capabilityDelegation, keyAgreement} = keys;

    // Set the defaults for the created keys (if needed)
    const keyOptions = {type: keyType, controller: this.id};

    // Initialize capabilityInvocation key pair, used for proving control of DID
    if(capabilityInvocation !== false) {
      capabilityInvocation = capabilityInvocation ||
        await LDKeyPair.generate(keyOptions);
      this.capabilityInvocation = [capabilityInvocation.publicNode()];
    }

    // Generate authentication key pair, used for DIDAuth operations
    if(authentication !== false) {
      authentication = authentication || await LDKeyPair.generate(keyOptions);
      this.authentication = [authentication.publicNode()];
    }

    // Generate assertionMethod key pair, used for digital signatures (VCs)
    if(assertionMethod !== false) {
      assertionMethod = assertionMethod || await LDKeyPair.generate(keyOptions);
      this.assertionMethod = [assertionMethod.publicNode()];
    }

    // Generate capabilityDelegation key pair, used for delegating authorization
    if(capabilityDelegation !== false) {
      capabilityDelegation = capabilityDelegation ||
        await LDKeyPair.generate(keyOptions);
      this.capabilityDelegation = [capabilityDelegation.publicNode()];
    }

    // Generate keyAgreement key pair, used for key agreement for encryption
    if(keyAgreement !== false) {
      keyAgreement = keyAgreement || await X25519KeyPair.generate(keyOptions);
      this.keyAgreement = [keyAgreement.publicNode()];
    }

    const keyPurpose = [capabilityInvocation, authentication, assertionMethod,
      capabilityDelegation, keyAgreement].filter(purpose => purpose);

    const didKeys = {};
    for(const key of keyPurpose) {
      didKeys[key.id] = key;
    }

    return {didKeys};
  }

  /**
   * Returns all verification methods (keys) for a given proof purpose.
   *
   * @param proofPurpose {string} proof purpose identifier
   * @returns {object|undefined}
   */
  getAllVerificationMethods(proofPurpose) {
    // return this.doc[proofPurpose];
  }

  /**
   * Returns with the node for the verification method for the specified proof
   * purpose (from which you can create an LDKeyPair instance).
   * If no methodId or methodIndex is given, the first available non-revoked
   * key is returned.
   *
   * This is useful for when you know the _purpose_ of a key, but not its id.
   * (If you know the key id but need to find its purpose, use
   * `findVerificationMethod()` instead.)
   *
   * Usage:
   *
   *   ```
   *   const method = didDoc.getVerificationMethod(
   *     {proofPurpose: 'assertionMethod'});
   *
   *   // Now you can either create a key pair
   *   const keyPair = new LDKeyPair(method);
   *
   *   // Or get the key directly from the doc's key cache
   *   const keyPair = didDoc.keys[method.id];
   *   ```
   *
   * @param proofPurpose {string} For example, 'capabilityDelegation'
   *
   * @param [methodId] {string} method id (DID with hash fragment, like
   *   `did:example:1234#<key fingerprint>`)
   * @param [methodIndex] {number} The nth method in the set, zero-indexed.
   *
   * @returns {object} Public method data
   */
  getVerificationMethod({proofPurpose, methodId, methodIndex = 0}) {
    const methods = this.getAllVerificationMethods(proofPurpose);
    if(!methods) {
      throw new Error(`Method not found for proof purpose "${proofPurpose}".`);
    }

    let methodData;

    if(methodId) {
      methodData = methods.find(m => m.id === methodId);
    } else {
      methodData = methods[methodIndex];
    }
    // TODO: Check for revocation and expiration

    return methodData;
  }

  /**
   * Alias for `findVerificationMethod()`.
   * Example:
   * ```
   * findKey({id: 'did:ex:123#abcd'})
   * // ->
   * // {proofPurpose: 'authentication', key: { ... }}
   * ```
   * @returns {{proofPurpose: string, key: object}}
   */
  findKey({id}) {
    const {proofPurpose, method: key} = this.findVerificationMethod({id});
    return {proofPurpose, key};
  }

  /**
   * Finds a verification method for a given id, and returns it along with the
   * proof purpose in which it resides. (Note that if a key is included in
   * multiple proof purpose sections, the first occurrence is returned.)
   *
   * Useful for operations like rotate, since you need to know which proof
   * purpose section to add a new key to (after removing the old one).
   *
   * Example:
   * ```
   * findVerificationMethod({id: 'did:ex:123#abcd'})
   * // ->
   * // {proofPurpose: 'authentication', method: { ... }}
   * ```
   *
   * @param {string} id - Verification method id.
   * @returns {{proofPurpose: string, method: object}}
   */
  findVerificationMethod({id}) {
    if(!id) {
      throw new Error('Method id is required.');
    }

    for(const proofPurpose in PROOF_PURPOSES) {
      let method;
      try {
        method = this.getVerificationMethod({proofPurpose, methodId: id});
        if(method) {
          return {proofPurpose, method};
        }
      } catch(error) {
        // Method not found for that purpose, continue searching
      }
    }
    return {};
  }

  /**
   * Composes and returns a service id for a service name.
   *
   * @param {string} serviceName
   *
   * @returns {string} Service id
   */
  serviceIdFor(fragment) {
    if(!fragment) {
      throw new Error('Invalid service fragment.');
    }
    return `${this.id}#${fragment}`;
  }

  /**
   * Finds a service endpoint in this did doc, given an id or a name.
   *
   * @param {string} [fragment]
   * @param {string} [id]
   *
   * @returns {object}
   */
  findService({fragment, id}) {
    // const serviceId = id || this.serviceIdFor(fragment);
    //
    // return jsonld
    //   .getValues(this.doc, 'service')
    //   .find(service => service.id === serviceId);
  }

  /**
   * Tests whether this did doc has a service endpoint (by fragment or id).
   * One of `id` or `fragment` is required.
   *
   * @param {string} [id]
   * @param {string} [name]
   *
   * @returns {boolean}
   */
  hasService({id, fragment}) {
    return !!this.findService({id, fragment});
  }

  /**
   * Adds a service endpoint to this did doc.
   * One of `id` or `fragment` is required.
   *
   * @param {string} [fragment]
   * @param {string} [id]
   * @param {string} type URI (e.g. 'urn:AgentService')
   * @param {string} endpoint  URI (e.g. 'https://agent.example.com')
   */
  addService({fragment, endpoint, id, type}) {
    // if(!!id === !!fragment) {
    //   throw new Error('Exactly one of `fragment` or `id` is required.');
    // }
    // if(id && !id.includes(':')) {
    //   throw new Error('Service `id` must be a URI.');
    // }
    // const serviceId = id || this.serviceIdFor(fragment);
    //
    // if(!type || !type.includes(':')) {
    //   throw new Error('Service `type` is required and must be a URI.');
    // }
    // if(!endpoint || !endpoint.includes(':')) {
    //   throw new Error('Service `endpoint` is required and must be a URI.');
    // }
    //
    // if(this.findService({id, fragment})) {
    //   throw new Error('Service with that name or id already exists.');
    // }
    //
    // jsonld.addValue(this.doc, 'service', {
    //   id: serviceId,
    //   serviceEndpoint: endpoint,
    //   type,
    // }, {
    //   propertyIsArray: true
    // });
  }

  /**
   * Removes a service endpoint from this did doc.
   * One of `id` or `fragment` is required.
   *
   * @param {string} [fragment]
   * @param {string} [id]
   */
  removeService({id, fragment}) {
    // const serviceId = id || this.serviceIdFor(fragment);
    //
    // const services = jsonld
    //   .getValues(this.doc, 'service')
    //   .filter(service => service.id !== serviceId);
    // if(services.length === 0) {
    //   jsonld.removeProperty(this.doc, 'service');
    // } else {
    //   this.doc.service = services;
    // }
  }

  addKey({key, proofPurpose, controller = this.id}) {
    // Add public key node to the DID Doc
    const keys = this.getAllVerificationMethods(proofPurpose);
    if(!keys) {
      throw new Error(`Keys not found for proofPurpose "${proofPurpose}".`);
    }
    keys.push(key.publicNode({controller}));

    // Add keypair (public + private) to non-exported key storage
    this.keys[key.id] = key;
  }

  /**
   * @param key {LDKeyPair}
   */
  removeKey(key) {
    // check all proof purpose keys
    for(const proofPurposeType of Object.values(PROOF_PURPOSES)) {
      if(this.doc[proofPurposeType]) {
        this.doc[proofPurposeType] = this.doc[proofPurposeType]
          .filter(k => k.id !== key.id);
      }
    }

    // also remove key from this doc's keys hash
    delete this.keys[key.id];
  }

  /**
   * Rotates a key in this did document (removes the old one, and generates and
   * adds a new one to the same proof purpose section). Key id is not re-used.
   *
   * One of the following is required:
   * @param {LDKeyPair} [key] - Key object (with an .id)
   * @param {string} [id] - Key id
   *
   * @param {string} [passphrase] - Optional passphrase to encrypt the new key.
   *
   * @returns {Promise<LDKeyPair>} Returns new key (after removing the old one)
   */
  async rotateKey({key, id, passphrase}) {
    // if(!key && !id) {
    //   throw new Error('A key id or key object is required to rotate.');
    // }
    // const keyId = id || key.id;
    // const {proofPurpose, key: oldKey} = this.findKey({id: keyId});
    // if(!oldKey) {
    //   throw new Error(`Key ${keyId} is not found in did document.`);
    // }
    // const keyType = oldKey.type;
    // const controller = oldKey.controller;
    //
    // // Start the observer if necessary (generates patches for update())
    // if(!this.observer) {
    //   this.observe();
    // }
    //
    // // First, remove the old key
    // this.removeKey({id: keyId});
    //
    // // Generate an add a new key to the same proof purpose (key id not re-used)
    // const newKey = await LDKeyPair.generate({type: keyType, passphrase});
    // newKey.id = VeresOneDidDoc.generateKeyId({did: this.id, keyPair: newKey});
    // newKey.controller = controller;
    //
    // this.addKey({key: newKey, proofPurpose, controller});
    //
    // return newKey;
  }
}

module.exports = {
  DidDocument
};
