/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Constants = require('./constants');
const VeresOneClient = require('./client');
const VeresOneDidDoc = require('./veres-did-doc');
const KeyStore = require('../../key-store');
const MetaStore = require('../../meta-store');
const Injector = require('../../Injector');

class VeresOne {
  constructor(options = {}) {
    this.injector = options.injector || new Injector();
    this.ledger = 'veres';
    this.client = options.client || new VeresOneClient();
    this.keys = new KeyStore({injector: this.injector});
    this.meta = new MetaStore({injector: this.injector});
  }

  /**
   * Fetches a DID Document for a given DID.
   * @param did {string}
   *
   * @param options {object}
   * @param [options.mode] {string} One of 'dev'/'test'/'live'
   * @param [options.hostname] {string} Optional hostname of ledger (falls back
   *   to the default hostname for a particular mode)
   *
   * @returns {Promise<object>} Resolves to DID Document Fetch Result
   */
  async get(did, options) {
    return this.client.get(did, options);
  }

  /**
   * Generates a new DID Document with relevant key pairs.
   *
   * @param options
   * @param [options.didType='nym'] {string} DID type, 'nym' or 'uuid'
   *
   * @throws {Error}
   *
   * @returns {VeresOneDidDoc}
   */
  async generate({didType = 'nym', keyType = Constants.DEFAULT_KEY_TYPE,
                  passphrase, env = 'dev'}) {
    return VeresOneDidDoc.generate({didType, keyType, passphrase, env,
      injector: this.injector});
  }

  /**
   * @param options
   *
   * @param [options.accelerator] {string} Hostname of accelerator to use
   * @param [options.auth] {string} Auth DID, required when using an accelerator
   *
   * @param didDocument {object}
   * @param didKeys {object}
   *
   * @returns {Promise}
   */
  async register({options, didDocument, didKeys}) {
    // const hostname = _getHostname(options);
    // if (operationType === 'create') {
    //   _log(options, 'Preparing to register a DID on Veres One...');
    // } else {
    //   _log(options, 'Preparing to update a DID Document on Veres One...');
    // }

    // wrap DID Document in a web ledger operation
    let operation = this.wrap({didDocument, operationType: 'create'});

    if(options.accelerator) {
      // use accelerator
      // _log(options, 'Using accelerator...');
      if(!options.auth) {
        throw new Error('Authorization DID required');
      }
      const authKeys = await this.keys.load(options.auth);

      // send DID Document to a Veres One accelerator
      // _log(options, 'Generating accelerator signature...');
      const response = await this.client.sendToAccelerator({
        operation,
        hostname: options.accelerator,
        env: options.mode,
        keyId: authKeys.authentication[0].publicKey.id,
        key: authKeys.authentication[0].publicKey[0]
          .privateKey.privateKeyBase58 ||
          authKeys.authentication[0].publicKey[0].privateKey.privateKeyPem
      });
      operation = await response.json();
    } else {
      // attach an equihash proof
      // _log(options, 'Generating Equihash proof of work... (60-120 seconds)');
      operation = await this.attachEquihashProof({operation});
    }

    // get public key ID
    const creator = didDocument.invokeCapability[0].publicKey[0].id;

    // get private key
    const privateKey = didKeys.invokeCapability[0].publicKey[0].privateKey;

    if(!privateKey) {
      throw new Error('Private key required to perform a send');
    }

    // attach capability invocation proof
    // _log(options, 'Attaching LD-OCAP invocation proof...');

    operation = await this.attachInvocationProof({
      operation,
      capability: didDocument.id,
      // operationType === 'create' ? 'RegisterDid' : 'UpdateDidDocument',
      capabilityAction: 'RegisterDid',
      creator,
      privateKeyPem: privateKey.privateKeyPem,
      privateKeyBase58: privateKey.privateKeyBase58,
    });

    // send DID Document to a Veres One ledger node
    // if (operationType === 'create') {
    //   _log(options, 'Registering DID on Veres One...');
    // } else {
    //   _log(options, 'Updating DID Document on Veres One...');
    // }
    const response = await this.client.send({operation, ...options});

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
  }

  async update() {}

  /**
   * Adds an ocap invocation proof to an operation.
   *
   * TODO: support `passphrase` for encrypted private key pem or keep decrypt
   * as the responsibility of the caller?
   *
   * FIXME: use ldocap.js
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
    return jsigs.sign(didDocument, {
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
        operation.record = didDocument;
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
