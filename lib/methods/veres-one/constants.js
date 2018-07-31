/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */

module.exports = {
  VERES_ONE_V1_CONTEXT: 'https://w3id.org/veres-one/v1',
  DEFAULT_KEY_TYPE: 'Ed25519VerificationKey2018',
  SUPPORTED_KEY_TYPES: ['RsaVerificationKey2018', 'Ed25519VerificationKey2018'],
  SUITES: {
    authentication: 'authentication',
    capabilityDelegation: 'capabilityDelegation',
    capabilityInvocation: 'capabilityInvocation'
  }
};
