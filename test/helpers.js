/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {validateDid} from '../lib/validators.js';

export function testDid(did) {
  try {
    validateDid({did});
  } catch(e) {
    return e;
  }
}
