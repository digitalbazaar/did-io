/*!
 * Copyright (c) 2020 Veres One Project. All rights reserved.
 */
'use strict';

const didContext = require('did-context');

module.exports = {
  DID_CONTEXT_URL: didContext.constants.DID_CONTEXT_URL,
  PROOF_PURPOSES: [
    'capabilityInvocation',
    'authentication',
    'assertionMethod',
    'capabilityDelegation',
    'keyAgreement'
    // 'contractAgreement' // not supported yet
  ]
};
