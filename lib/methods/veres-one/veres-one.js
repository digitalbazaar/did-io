/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Constants = require('./constants');
const VeresOneClient = require('./client');
const VeresOneDidDoc = require('./veres-did-doc');
const Injector = require('../../Injector');
const storage = require('../../storage')

class VeresOne {
  constructor(options = {}) {
    this.injector = options.injector || new Injector();
    this.ledger = 'veres';
    this.mode = options.mode || 'test';
    this.client = options.client || new VeresOneClient();

    this.keyStore = options.keyStore ||
      storage.keyStore({ledger: this.ledger, mode: this.mode});
    this.metaStore = options.metaStore ||
      storage.metaStore({ledger: this.ledger, mode: this.mode});
    this.didStore = options.didStore ||
      storage.didStore({ledger: this.ledger, mode: this.mode});
  }

  /**
   * Fetches a DID Document for a given DID.
   *
   * @param did {string}
   *
   * @param [mode] {string} One of 'dev'/'test'/'live'
   *
   * @param [hostname] {string} Optional hostname of ledger (falls back
   *   to the default hostname for a particular mode)
   *
   * @param [autoObserve=false] {boolean} Start tracking changes to the DID Doc
   *   (to generate a diff patch later).
   *
   * @returns {Promise<VeresOneDidDoc>}
   */
  async get({did, mode, hostname, autoObserve = false}) {
    const result = await this.client.get({did, mode, hostname});
    const didDoc = new VeresOneDidDoc({injector: this.injector, ...result});
    const keysData = await this.keyStore.get(did);
    didDoc.importKeys(keysData);

    if(autoObserve) {
      didDoc.observe();
    }

    return didDoc;
  }

  /**
   * Generates a new DID Document with relevant keys, saves keys in key store.
   *
   * @param options
   * @param [options.didType='nym'] {string} DID type, 'nym' or 'uuid'
   *
   * @throws {Error}
   *
   * @returns {Promise<VeresOneDidDoc>}
   */
  async generate({didType = 'nym', keyType = Constants.DEFAULT_KEY_TYPE,
                  passphrase = null, env = 'dev'}) {
    const didDoc = await VeresOneDidDoc.generate({didType, keyType, passphrase,
      env, injector: this.injector});

    await this.saveKeys(didDoc);
    await this.saveDoc(didDoc);

    return didDoc;
  }

  /**
   * Saves all the keys (public and private) in the key store.
   *
   * @param didDoc
   *
   * @returns {Promise}
   */
  async saveKeys(didDoc) {
    return this.keyStore.put(didDoc.id, await didDoc.exportKeys());
  }

  async saveDoc(didDoc) {
    return this.didStore.put(didDoc.id, didDoc);
  }

  /**
   * Registers a DID Document on the Veres One ledger.
   *
   * @param options {object} Options hashmap, see `send()` docstring.
   *
   * @returns {Promise<object>} Result of the register operation.
   */
  async register(options) {
    // wrap DID Document in a web ledger operation
    const operation = this.wrap(
      {didDocument: options.didDocument, operationType: 'create'}
    );

    return this.send(operation, options);
  }

  /**
   * Records an update to a DID Document on the Veres One ledger.
   *
   * @param options {object} Options hashmap, see `send()` docstring.
   *
   * @returns {Promise<object>} Result of the update operation.
   */
  async update(options) {
    const operation = this.wrap(
      {didDocument: options.didDocument, operationType: 'update'}
    );

    return this.send(operation, options);
  }

  /**
   * Sends a DID Document operation (register/update) the Veres One ledger
   * by either:
   *
   *  1. Using an Accelerator service, in which case an authorization DID
   *     Document is required beforehand (typically obtained in exchange for
   *     payment). Or,
   *  2. Attaching an Equihash proof of work (requires time).
   *
   * @param operation {object} WebLedger operation
   *
   * @param options {object}
   *
   * @param options.didDocument {VeresOneDidDoc} Document to update
   *
   * @param [options.accelerator] {string} Hostname of accelerator to use
   * @param [options.authDoc] {VeresOneDidDoc} Auth DID Doc, required if using
   *   an accelerator service
   *
   * @param [options.notes]
   *
   * @returns {Promise}
   */
  async send(operation, options) {
    // if (operationType === 'create') {
    //   _log(options, 'Preparing to register a DID on Veres One...');
    // } else {
    //   _log(options, 'Preparing to update a DID Document on Veres One...');
    // }
    const {didDocument} = options;

    if(options.accelerator) {
      // send operation to an accelerator for proof
      operation = await this.attachAcceleratorProof({operation, ...options});
    } else {
      // attach an equihash proof
      // _log(options, 'Generating Equihash proof of work... (60-120 seconds)');
      operation = await this.attachEquihashProof({operation});
    }

    // get private key
    const invokeKeyId = didDocument.doc.invokeCapability[0].publicKey[0].id;
    const creator = invokeKeyId;
    const invokeKey = didDocument.keys[invokeKeyId];
    if(!invokeKey.secretKey) {
      throw new Error('Invocation key required to perform a send');
    }

    const secretKey = await invokeKey.export();

    // attach capability invocation proof
    // _log(options, 'Attaching LD-OCAP invocation proof...');
    const capabilityAction = operation.type.startsWith('Create')
      ? 'RegisterDid'
      : 'UpdateDidDocument';

    operation = await this.attachInvocationProof({
      operation,
      capability: didDocument.id,
      capabilityAction,
      creator,
      privateKeyPem: secretKey.secretKeyPem,
      privateKeyBase58: secretKey.secretKeyBase58,
    });

    // send DID Document to a Veres One ledger node
    // if (operationType === 'create') {
    //   _log(options, 'Registering DID on Veres One...');
    // } else {
    //   _log(options, 'Updating DID Document on Veres One...');
    // }
    const response = await this.client
      .send({operation, authKey: invokeKey, ...options});

    if(response.status !== 204) {
      // TODO: Throw error here
      // _error(options, 'Failed to register DID Document.');
      // _error(options, 'Status Code: ' + response.status);
      // _error(options, 'Response Body: ' +
      //   JSON.stringify(await response.json(), null, 2));
    }
    // if(operationType === 'create') {
    //   _log(options, 'DID registration send to ledger.');
    // } else {
    //   _log(options, 'DID Document update sent to the Veres One ledger.');
    // }
    // _log(options, 'Please wait ~15-30 seconds for ledger consensus.');
    // _log(options, 'You may use the `info` command to monitor the ' +
    //   'registration of your DID.');

    if(options.notes) {
      // save ledger if requested
      this.meta.saveNotes(didDocument, options);
    }
    return response;
  }

  /**
   * Sends a ledger operation to an accelerator.
   * Required when registering a DID Document (and not using an Equihash proof).
   *
   * @param options {object}
   *
   * @returns {Promise<object>} Resolves with a wrapped Web Ledger operation,
   *   with additional proof from accelerator.
   */
  async attachAcceleratorProof(options) {
    if(!options.authDoc) {
      throw new Error('Authorization DID Doc required');
    }
    const authKey = options.authDoc.doc.authentication[0];

    // send DID Document to a Veres One accelerator
    // _log(options, 'Generating accelerator signature...');
    const response = await this.client.sendToAccelerator({
      operation: options.operation,
      hostname: options.accelerator,
      env: options.mode,
      authKey
    });
    return response.json();
  }

  /**
   * Adds an ocap invocation proof to an operation.
   *
   * TODO: support `passphrase` for encrypted private key pem or keep decrypt
   * as the responsibility of the caller?
   *
   * FIXME: use ldocap.js
   *
   * @returns {Promise<object>}
   */
  attachInvocationProof({operation, capability, capabilityAction, creator,
                         algorithm, privateKeyPem, privateKeyBase58}) {
    // FIXME: use `algorithm` and validate private key, do not switch off of it
    if(privateKeyPem) {
      algorithm = 'RsaSignature2018';
    } else {
      algorithm = 'Ed25519Signature2018';
    }

    // FIXME: validate operation, capability, creator, and privateKeyPem
    // TODO: support `signer` API as alternative to `privateKeyPem`
    const jsigs = this.injector.use('jsonld-signatures');
    return jsigs.sign(operation, {
      algorithm,
      creator,
      privateKeyPem,
      privateKeyBase58,
      proof: {
        '@context': Constants.VERES_ONE_V1_CONTEXT,
        proofPurpose: 'invokeCapability',
        capability,
        capabilityAction
      }
    });
  }

  /**
   * Adds an Equihash proof of work to an operation.
   *
   * @returns {Promise}
   */
  attachEquihashProof({operation, env = 'dev', parameters}) {
    let nParam;
    let kParam;
    if(parameters) {
      if(!(typeof parameters.n === 'number' &&
          typeof parameters.k === 'number')) {
        throw new TypeError(
          '`parameters.n` and `parameters.k` must be integers.');
      }
      nParam = parameters.n;
      kParam = parameters.k;
    } else {
      switch(env) {
        case 'dev':
        case 'test':
          nParam = 64;
          kParam = 3;
          break;
        case 'live':
          // FIXME: determine from ledger config
          nParam = 144;
          kParam = 5;
          break;
        default:
          throw new Error('"env" must be "dev", "test", or "live".');
      }
    }

    const jsigs = this.injector.use('jsonld-signatures');
    return jsigs.sign(operation, {
      algorithm: 'EquihashProof2018',
      parameters: {
        n: nParam,
        k: kParam
      }
    });
  }

  /**
   * Adds an ocap grant proof to a capability DID Document.
   *
   * TODO: support `passphrase` for encrypted private key pem or keep decrypt
   *   as the responsibility of the caller?
   * FIXME: use ldocap.js
   */
  attachGrantProof({didDocument, creator, privateKeyPem}) {
    // FIXME: validate didDocument, creator, and privateKeyPem
    // TODO: support `signer` API as alternative to `privateKeyPem`
    const jsigs = this.injector.use('jsonld-signatures');
    return jsigs.sign(didDocument.doc, {
      algorithm: 'RsaSignature2018',
      creator,
      privateKeyPem,
      proof: {
        '@context': Constants.VERES_ONE_V1_CONTEXT,
        proofPurpose: 'grantCapability'
      }
    });
  }

  /**
   * Wraps a DID Document in a Web Ledger Operation.
   */
  wrap({didDocument, operationType = 'create'}) {
    const operation = {
      '@context': Constants.VERES_ONE_V1_CONTEXT
    };

    switch(operationType) {
      case 'create':
        operation.type = 'CreateWebLedgerRecord';
        operation.record = didDocument.doc;
        break;
      case 'update':
        operation.type = 'UpdateWebLedgerRecord';
        operation.recordPatch = didDocument.commit();
        break;
      default:
        throw new Error(`Unknown operation type "${operationType}"`);
    }

    return operation;
  }
}

VeresOne.contexts = {
  [Constants.VERES_ONE_V1_CONTEXT]: require('./contexts/veres-one-v1')
};

module.exports = VeresOne;
