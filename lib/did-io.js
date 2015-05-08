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

api.test = function(callback) {
  console.log('╯‵Д′)╯彡┻━┻  (test successful)');
  callback();
}

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
  var version = options.version || 'did-io';
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
