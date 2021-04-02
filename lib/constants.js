/*!
 * Copyright (c) 2021 Digital Bazaar. All rights reserved.
 */
/**
 * A verification relationship expresses the relationship between the DID
 * subject and a verification method (such as a cryptographic public key).
 * Different verification relationships enable the associated verification
 * methods to be used for different purposes.
 *
 * @see https://w3c.github.io/did-core/#verification-relationships
 * @type {Map<string, boolean>}
 */
export const VERIFICATION_RELATIONSHIPS = new Map([
  ['assertionMethod', true],
  ['authentication', true],
  ['capabilityDelegation', true],
  ['capabilityInvocation', true],
  ['keyAgreement', true]
]);
