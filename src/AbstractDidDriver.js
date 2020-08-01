export class AbstractDidDriver {
  constructor({method = 'ex'}) {
    // did:ex:...
    this.method = method;
  }

  /**
   * Generates and returns the id of a given key. Used by `did-io` drivers.
   *
   * @param {LDKeyPair} key
   * @param {string} [did] - Optional DID.
   *
   * @returns {Promise<string>} Returns the key's id.
   */
  async computeKeyId() {}

  /**
   * @returns {Promise<{didDocument: DidDocument, keys: object}>}
   */
  async generate() {}

  /**
   * Fetches a DID Document for a given DID.
   * @param {string} did
   *
   * @returns {Promise<DidDocument>}
   */
  async get() {}
}

