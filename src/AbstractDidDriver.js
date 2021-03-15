export class AbstractDidDriver {
  constructor({method = 'ex'}) {
    // did:ex:...
    this.method = method;
  }

  /**
   * @returns {Promise<{didDocument: DidDocument, keyPairs: object}>}
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

