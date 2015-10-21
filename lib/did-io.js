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
 *          [inject] *deprecated*, use `use` API instead; the dependencies to
 *            inject, available global defaults will be used otherwise.
 *            [forge] forge API.
 *            [uuid] The node-uuid API.
 *            [jsonld] jsonld.js API; all remote documents will be loaded
 *              using jsonld.documentLoader by default, so ensure a secure
 *              document loader is configured.
 */
function wrap(api, options) {

options = options || {};
var libs = {};

/* API Constants */

api.SECURITY_CONTEXT_URL = 'https://w3id.org/security/v1';

/* Core API */

/**
 * Allows injectables to be set or retrieved.
 *
 * @param name the name of the injectable to use (
 *          eg: `jsonld`, `jsonld-signatures`).
 * @param [api] the api to set for the injectable, only present for setter,
 *          omit for getter.
 */
api.use = function(name, api) {
  if(api) {
    libs[name] = api;
  }
  if(!libs[name]) {
    // handle aliases
    var requireName = name;
    var globalName = name;
    switch(name) {
      case 'forge':
        requireName = 'node-forge';
        break;
      case 'jsonld':
        globalName = 'jsonldjs';
        break;
      case 'uuid':
        requireName = 'node-uuid';
        break;
    }
    libs[name] = global[globalName] || (_nodejs && require(requireName));
    if(name === 'jsonld' && _nodejs) {
      // locally configure jsonld
      libs[name] = libs[name]();
      libs[name].useDocumentLoader('node', {secure: true, strictSSL: true});
    }
  }
  return libs[name];
};

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
  var uuid = api.use('uuid');
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
  var forge = api.use('forge');
  var md = forge.md.sha256.create();
  md.update(email + passphrase);
  return 'urn:sha256:' + md.digest().toHex();
};

api.validateDidFormat = function(did) {
  var didRegex = new RegExp('^did\:[0-9a-f]{8}-[0-9a-f]{4}-' +
    '4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');
  return didRegex.test(did);
};

api.getDidDocument = function(did, callback) {
  if(!api.validateDidFormat(did)) {
    return callback(new Error('Invalid DID'));
  }
  var url = 'https://authorization.io/dids/' + did;
  var jsonld = api.use('jsonld');
  jsonld.documentLoader(url, function(err, doc) {
    if(err) {
      err.status = err.httpStatusCode || 404;
      return callback(err);
    }
    doc = doc.document;
    if(typeof doc === 'string') {
      try {
        doc = JSON.parse(doc);
      } catch(e) {}
    }
    callback(null, doc);
  });
};

api.getIdpDocument = function(did, callback) {
  api.getDidDocument(did, callback);
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

// handle dependency injection
(function() {
  var inject = options.inject || {};
  for(var name in inject) {
    api.use(name, inject[name]);
  }
})();

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
