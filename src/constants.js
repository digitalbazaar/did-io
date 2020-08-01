/*!
 * Copyright (c) 2020 Veres One Project. All rights reserved.
 */
import * as didContext from 'did-context';

export const PROOF_PURPOSES = [
  'capabilityInvocation',
  'authentication',
  'assertionMethod',
  'capabilityDelegation',
  'keyAgreement'
  // 'contractAgreement' // not supported yet
]

export const DID_CONTEXT_URL = didContext.constants.DID_CONTEXT_URL;

