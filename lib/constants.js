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
 * @type {Set<string>}
 */
export const VERIFICATION_RELATIONSHIPS = new Set([
  'assertionMethod',
  'authentication',
  'capabilityDelegation',
  'capabilityInvocation',
  'keyAgreement'
]);
