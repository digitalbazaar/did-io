/**
 * A WebDHT-based library for managing decentralized identifiers and
 * associated data.
 *
 * @author Manu Sporny <msporny@digitalbazaar.com>
 * @author Dave Longley <dlongley@digitalbazaar.com>
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * BSD 3-Clause License
 * Copyright (c) 2015 Digital Bazaar, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *.now
 * Neither the name of the Digital Bazaar, Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(global) {

'use strict';

// determine if using node.js or browser
var _nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
var _browser = !_nodejs &&
  (typeof window !== 'undefined' || typeof self !== 'undefined');

/**
 * Attaches the DID I/O API to the given object.
 *
 * @param api the object to attach the DID I/O API to.
 * @param [options] the options to use:
 *          [inject] the dependencies to inject, available global defaults will
 *            be used otherwise.
 *            [async] async API.
 *            [forge] forge API.
 *            [uuid] The node-uuid API.
 *            [jsonld] jsonld.js API; all remote documents will be loaded
 *              using jsonld.documentLoader by default, so ensure a secure
 *              document loader is configured.
 *            [_] underscore API.
 *          [disableLocalFraming] true to disable framing of local
 *            documents based on the given local base URI (default: false).
 *          [localBaseUri] must be given if disabling local framing.
 */
function wrap(api, options) {

// handle dependency injection
options = options || {};
var inject = options.inject || {};
var async = inject.async || global.async;
var crypto = inject.crypto || global.crypto;
var forge = inject.forge || global.forge;
var jsonld = inject.jsonld || global.jsonldjs;
var uuid = inject.uuid || global.uuid;
var _ = inject._ || global._;

// if dependencies not loaded and using node, load them
if(_nodejs) {
  if(!async) {
    async = require('async');
  }
  if(!crypto) {
    crypto = require('crypto');
  }
  if(!forge) {
    forge = require('node-forge');
  }
  if(!uuid) {
    uuid = require('node-uuid');
  }
  if(!jsonld) {
    // locally configure jsonld
    jsonld = require('jsonld')();
    jsonld.useDocumentLoader('node', {secure: true, strictSSL: true});
  }
  if(!_) {
    _ = require('underscore');
  }
}

/* API Constants */

api.SECURITY_CONTEXT_URL = 'https://w3id.org/security/v1';

/* Core API */

/**
 * Generates a decentralized identifier of the form:
 *
 * did:xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * The format is did: with a version 4 UUID appended to it. The x's are
 * any hexadecimal digit and y is one of 8, 9, A, or B.
 *
 * @returns a version 4 UUID
 */
api.generateDid = function() {
  return 'did:' + uuid.v4();
};

/**
 * Generates a hash that is appropriate for use as a key in a hash -> blob
 * mapping on the decentralized storage network.
 *
 * @param email a string that is easy to remember, typically an email address.
 * @param passphrase a long string that is memorable.
 *
 * @return a hex-encoded sha256 hash of the input.
 */
api.generateHash = function(email, passphrase) {
  var md = forge.md.sha256.create();
  md.update(email + passphrase);
  return md.digest().toHex();
};

/**
 * Approximate the number of PBKDF2 iterations this machine can calculate.
 * The minimum number of iterations that will be picked is 4096 to ensure
 * a sampling error does not result in a weak number of iterations.
 *
 * FIXME: This algorithm will be problematic if devices with drastically
 * different compute abilities are used.
 *
 * @return the number of iterations to use in a PBKDF2 key derivation that
 *         will result in roughly a second per key generation.
 */
function getPbkdf2IterationCount() {
  var effortInMilliseconds = 1000
  var salt = forge.random.getBytesSync(128);
  var time = 0;

  // approximate the amount of effort taken to perform a PBKDF2 key derivation
  while(time < 1) {
    var start = new Date();
    var key = forge.pkcs5.pbkdf2('xxxxxxxx', salt, 1000, 16);
    var end = new Date();
    time = end.getTime() - start.getTime();
  }

  // calculate how many iterations are needed to result in 1 second
  // to derive a key
  var iterations = Math.round(1000 * (effortInMilliseconds / time));
  if(iterations < 4096) {
    iterations = 4096;
  }

  return iterations;
};

/**
 * Encrypts a provided DID using PBKDF2 and AES-GCM.
 *
 * @param did the DID to encrypt.
 * @param password the password to use for key derivation.
 *
 * @return the encrypted message.
 */
api.encrypt = function(did, password) {
  var salt = forge.random.getBytesSync(128);
  var iterationCount = getPbkdf2IterationCount();
  var key = forge.pkcs5.pbkdf2(password, salt, iterationCount, 16);
  var iv = forge.random.getBytesSync(16);
  var cipher = forge.cipher.createCipher('AES-GCM', key);

  cipher.start({
    iv: iv, // should be a 12-byte binary-encoded string or byte buffer
    tagLength: 128 // optional, defaults to 128 bits
  });
  cipher.update(forge.util.createBuffer(did));
  cipher.finish();
  var encrypted = forge.util.encode64(cipher.output.getBytes());

  // build the encrypted message
  var encryptedMessage = {
    "@context": "https://w3id.org/security/v1",
    type: "EncryptedMessage",
    cipherAlgorithm: 'pbkdf2-sha1-aes-128-gcm',
    salt: forge.util.encode64(salt),
    authenticationTag: forge.util.encode64(cipher.mode.tag.getBytes()),
    iterationCount: iterationCount,
    initializationVector: forge.util.encode64(iv),
    cipherData: encrypted
  };

  return encryptedMessage;
}

/**
 * Decrypts an encrypted DID using PBKDF2 and AES-GCM.
 *
 * @param message the encrypted message to decrypt.
 * @param password the password to use for key derivation.
 *
 * @return the decrypted data or null if the decryption failed.
 */
api.decrypt = function(message, password) {
  // check to see if the cipherAlgorithm is something we recognize
  if(message.cipherAlgorithm !== 'pbkdf2-sha1-aes-128-gcm') {
    return null;
  }

  // derive the key
  var key = forge.pkcs5.pbkdf2(
    password, forge.util.decode64(message.salt), message.iterationCount, 16);
  // setup the cipher
  var decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({
    iv: forge.util.createBuffer(
      forge.util.decode64(message.initializationVector)),
    tagLength: 128,
    tag: forge.util.createBuffer(
      forge.util.decode64(message.authenticationTag))
  });

  // decrypt the encrypted message
  var cipherData = forge.util.createBuffer(
    forge.util.decode64(message.cipherData));
  decipher.update(cipherData);
  var pass = decipher.finish();
  var did = decipher.output.getBytes();

  return (pass) ? did : null;
};

/* Promises API */

/**
 * Creates a new promises API object.
 *
 * @param [options] the options to use:
 *          [api] an object to attach the API to.
 *          [version] 'did-io-1.0' to use the standard API
 *                      (default: 'did-io-1.0')
 *
 * @return the promises API object.
 */
api.promises = function(options) {
  options = options || {};
  var slice = Array.prototype.slice;
  var promisify = jsonld.promisify;

  // handle 'api' option as version, set defaults
  var papi = options.api || {};
  var version = options.version || 'did-io-1.0';
  if(typeof options.api === 'string') {
    if(!options.version) {
      version = options.api;
    }
    papi = {};
  }

  try {
    api.Promise = global.Promise || require('es6-promise').Promise;
  } catch(e) {
    var f = function() {
      throw new Error('Unable to find a Promise implementation.');
    };
    for(var method in api) {
      papi[method] = f;
    }
  }

  return papi;
};

return api;

} // end wrap

// used to generate a new verifier API instance
var factory = function(inject) {
  return wrap(function() {return factory();}, inject);
};

if(_nodejs) {
  // export nodejs API
  module.exports = factory;
} else if(typeof define === 'function' && define.amd) {
  // export AMD API
  define([], function() {
    return factory;
  });
} else if(_browser) {
  // export simple browser API
  if(typeof global.didio === 'undefined') {
    global.didio = {};
  }
  wrap(global.didio);
}

})(typeof window !== 'undefined' ? window : this);
