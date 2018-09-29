/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const path = require('path');
const Store = require('flex-docstore');
const os = require('os');

/**
 * By default, keys are stored in `~/.dids/<method>/<mode>/` (where `mode` is
 * `test`/`live` etc), and are organized by DID.
 * For example, for a DID of "did:method:abcd", you would have the following
 * files:
 *
 * - `did:method:abcd.json`
 * - `did:method:abcd.keys.json`
 * - `did:method:abcd.meta.json`
 *
 * Example Usage:
 *
 * ```
 * // Write to the store
 * await v1.didStore.put(did, didDoc);
 *
 * // Read from store
 * const didDocJson = await v1.didStore.get(did);
 *
 * // Remove from store
 * await v1.didStore.remove(did);
 *
 * // Read a non-existent key
 * const result = await v1.didStore.get(deletedDid);
 * // result -> null  (does not throw an error)
 * ```
 *
 * @param [options.ledger] {string} Ledger id, for example, 'veres'
 * @param [options.mode] {string} 'test'/'live'
 */
function didStore(options) {
  const dir = options.dir ||
    path.join(os.homedir(), '.dids', options.ledger, options.mode);
  const extension = '.json';
  return Store.using('files', {dir, extension, ...options});
}

function keyStore(options) {
  const dir = options.dir ||
    path.join(os.homedir(), '.dids', options.ledger, options.mode);
  const extension = '.keys.json';
  return Store.using('files', {dir, extension, ...options});
}

function metaStore(options) {
  const dir = options.dir ||
    path.join(os.homedir(), '.dids', options.ledger, options.mode);
  const extension = '.meta.json';
  return Store.using('files', {dir, extension, ...options});
}

module.exports = {
  didStore,
  keyStore,
  metaStore
};
