/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const VeresOneClient = require('./client');
const KeyStore = require('../../key-store');
const Injector = require('../../Injector');
const didUtil = require('../../util');

const DEFAULT_KEY_TYPE = 'RsaVerificationKey2018';

const constants = {
  VERES_ONE_V1_CONTEXT: 'https://w3id.org/veres-one/v1'
};

class VeresOne {
  constructor(options = {}) {
    this.injector = options.injector || new Injector();
    this.ledger = 'veres';
    this.client = options.client || new VeresOneClient();
    this.keys = new KeyStore({injector: this.injector});
  }

  /**
   * Fetches a DID Document for a given DID.
   * @param did {string}
   * @param [hostname] {string} Optional hostname of ledger (falls back to the
   *   default hostname for a particular mode
   *
   * @param options {object}
   * @param [options.mode] {string} One of 'dev'/'test'/'live'
   *
   * @returns {Promise<object>} Resolves to DID Document Fetch Result
   */
  async get(did, hostname, options) {
    return this.client.get(did, hostname, options);
  }

  /**
   * Generates a new public/private DID Document pair.
   */
  async generate({didType = 'nym', keyType = DEFAULT_KEY_TYPE,
                  passphrase, env = 'dev'}) {
    const publicDidDocument = {
      '@context': VeresOne.constants.VERES_ONE_V1_CONTEXT,
    };
    let privateDidDocument = null;

    // passphrase is a required parameter if generating a nym-based DID
    if(didType === 'nym' && passphrase === undefined) {
      throw new TypeError('"options.passphrase" must be specified.');
    }

    if(didType === 'nym') {
      const supportedKeyTypes = [
        'RsaVerificationKey2018', 'Ed25519VerificationKey2018'
      ];
      if(!supportedKeyTypes.includes(keyType)) {
        throw new Error(`Unknown key type: "${keyType}"`);
      }

      let generateKeyPair;
      let encodePublicKey;
      let encryptPrivateKey;
      let authenticationAppSuiteType;
      let ocapAppSuiteType;
      if(keyType === 'Ed25519VerificationKey2018') {
        authenticationAppSuiteType = 'Ed25519SignatureAuthentication2018';
        ocapAppSuiteType = 'Ed25519SignatureCapabilityAuthorization2018';
        generateKeyPair = this.keys.generateEd25519KeyPair.bind(this.keys);
        encodePublicKey = this.keys.addEncodedEd25519PublicKey.bind(this.keys);
        encryptPrivateKey =
          this.keys.addEncryptedEd25519PrivateKey.bind(this.keys);
      } else {
        // RSA key
        authenticationAppSuiteType = 'RsaSignatureAuthentication2018';
        ocapAppSuiteType = 'RsaSignatureCapabilityAuthorization2018';
        const keyBits = (keyType === 'RsaVerificationKey2018') ? 2048 : 2048;
        generateKeyPair = async () => {
          return this.keys.generateRsaKeyPair.bind(this.keys)(keyBits);
        };
        encodePublicKey = this.keys.addEncodedRsaPublicKey.bind(this.keys);
        encryptPrivateKey = this.keys.addEncryptedRsaPrivateKey.bind(this.keys);
      }

      // application suite parameters
      const appSuites = {
        // for authenticating as DID entity
        authentication: {
          type: authenticationAppSuiteType,
          publicKeyHash: 'authn-key-1'
        },
        // for granting capabilities as DID entity
        grantCapability: {
          type: ocapAppSuiteType,
          publicKeyHash: 'ocap-grant-key-1'
        },
        // for invoking capabilities as DID entity
        invokeCapability: {
          type: ocapAppSuiteType,
          publicKeyHash: 'ocap-invoke-key-1'
        }
      };

      // generate a separate key pair for each app suite
      for(const name in appSuites) {
        appSuites[name].keys = await generateKeyPair();
      }

      // generate nym using authentication app suite
      const did = this.keys.createCryptonymDid({
        publicKey: appSuites.authentication.keys.publicKey,
        encoding: typeof appSuites.authentication.keys.publicKey === 'string' ?
          'base58' : 'forge',
        env
      });

      publicDidDocument.id = did;

      // add app suites to DID Document
      for(const name in appSuites) {
        const appSuite = appSuites[name];
        publicDidDocument[name] = [{
          type: appSuite.type,
          publicKey: [encodePublicKey({
            id: did + '#' + appSuite.publicKeyHash,
            type: keyType,
            owner: did
          }, appSuite.keys.publicKey)]
        }];
      }

      // add private key information to the private DID document
      privateDidDocument = didUtil.deepClone(publicDidDocument);
      for(const name in appSuites) {
        const {privateKey} = appSuites[name].keys;
        const {publicKey} = privateDidDocument[name][0];
        publicKey[0].privateKey = await encryptPrivateKey(
          {}, privateKey, passphrase);
      }
    } else {
      const uuid = this.injector.use('uuid');
      const prefix = (env === 'live') ? 'did:v1:' : 'did:v1:test:';
      publicDidDocument.id = prefix + 'uuid:' + uuid();
      privateDidDocument = didUtil.deepClone(publicDidDocument);
    }

    return {publicDidDocument, privateDidDocument};
  }

  async register() {}

  async update() {}

  wrap({didDocument, operationType = 'create'}) {
    const operation = {
      '@context': VeresOne.constants.VERES_ONE_V1_CONTEXT
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

VeresOne.constants = constants;
VeresOne.contexts = {
  [constants.VERES_ONE_V1_CONTEXT]: require('./contexts/veres-one-v1')
};

module.exports = VeresOne;
