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

api.IDENTITY_CONTEXT_URL = 'https://w3id.org/identity/v1';

/* Core API */

/**
 * Allows injectables to be set or retrieved.
 *
 * @param name the name of the injectable to use (
 *          eg: `jsonld`, `jsonld-signatures`).
 * @param [injectable] the api to set for the injectable, only present for setter,
 *          omit for getter.
 *
 * @return the API for `name` if not using this method as a setter, otherwise
 *   undefined.
 */
api.use = function(name, injectable) {
  // setter mode
  if(injectable) {
    libs[name] = injectable;
    return;
  }

  // getter mode:

  // api not set yet, load default
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
  // FIXME: use bcrypt here on password prior to hashing (this will need to
  // become an asynchronous API and we'll need some temporary backwards
  // compatibility) -- the worst danger of cracking the email+passphrase is
  // the potential revealing of email/memorableID+DID linkage, however, if
  // users do not follow best practices for passwords then they may have
  // reused email+passphrase on other services and this could be exploited
  var forge = api.use('forge');
  var md = forge.md.sha256.create();
  md.update(email + passphrase);
  return 'urn:sha256:' + md.digest().toHex();
};

/**
 * Validate the format of the given DID.
 *
 * @param did the DID to check.
 *
 * @return true if the DID's format is valid, false if not.
 */
api.validateDidFormat = function(did) {
  var didRegex = new RegExp('^did\:[0-9a-f]{8}-[0-9a-f]{4}-' +
    '4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');
  return didRegex.test(did);
};

/**
 * Gets a DID Document.
 *
 * @param did the DID to get.
 * @param [options] the options to use:
 *          [baseUrl] the HTTPS baseUrl for resolving DIDs.
 * @param callback(err, doc) called once the operation completes.
 */
api.getDidDocument = function(did, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl;
  if('baseUrl' in options) {
    if(typeof options.baseUrl !== 'string') {
      throw new Error('options.baseUrl must be a string.');
    }
    baseUrl = options.baseUrl;
  } else {
    baseUrl = 'https://authorization.io/dids/';
  }

  if(!api.validateDidFormat(did)) {
    return callback(new Error('Invalid DID.'));
  }
  var url = baseUrl + did;
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

/**
 * Resolves a DID URL to its resource.
 *
 * @param did the DID to get.
 * @param [options] the options to use:
 *          [baseUrl] the HTTPS baseUrl for resolving DIDs.
 * @param callback(err, doc) called once the operation completes.
 */
api.get = function(url, options, callback) {
  if(typeof url !== 'string') {
    throw new Error('url must be a string.');
  }
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  var jsonld = api.use('jsonld');
  var parsed = jsonld.url.parse(url);
  if(parsed.scheme !== 'did') {
    throw new Error('url scheme must be "did".');
  }

  var components = parsed.normalizedPath.split('/');
  var docId = 'did:' + components[0] || '';
  var target = 'did:' + components.join('/');
  api.getDidDocument(docId, options, function(err, doc) {
    if(err) {
      return callback(err);
    }
    if(components.length === 1) {
      // return full document
      return callback(null, doc);
    }
    // flatten to isolate docId and target
    jsonld.flatten(doc, function(err, flattened) {
      if(err) {
        return callback(err);
      }

      // filter out non-docId nodes and find target
      var found = false;
      var filtered = [];
      for(var i = 0; i < flattened.length; ++i) {
        var id = flattened[i]['@id'];
        if(id !== docId) {
          filtered.push(flattened[i]);
          if(id === target) {
            found = true;
          }
        }
      }

      // target not found
      if(!found) {
        err = new Error('Not Found');
        err.httpStatusCode = 404;
        err.status = 404;
        return callback(err);
      }

      // frame target
      jsonld.frame(
        filtered, {'@context': api.IDENTITY_CONTEXT_URL, id: target},
        {embed: '@always'}, function(err, framed) {
          if(err) {
            return callback(err);
          }
          var doc = {'@context': api.IDENTITY_CONTEXT_URL};
          var result = framed['@graph'][0];
          for(var key in result) {
            doc[key] = result[key];
          }
          callback(null, doc);
        });
    });
  });
};

/**
 * Creates a JSON-LD document loader that can be used with the `jsonld`
 * library and load `did` based URLs.
 *
 * @param [options] the options to use:
 *          [baseUrl] the HTTPS baseUrl for resolving DIDs.
 *          [wrap] an optional document loader to wrap if the scheme is not
 *            `did`; this makes wrapping `http`/`https` document loaders easy.
 *
 * @return the document loader.
 */
api.createDocumentLoader = function(options) {
  return function(url, callback) {
    if(!(typeof url === 'string' && url.indexOf('did:') === 0)) {
      if(!options.wrap) {
        return callback(new Error('url must be a string with scheme "did".'));
      }
      return options.wrap.apply(null, arguments);
    }
    api.get(url, options, function(err, doc) {
      if(err) {
        return callback(err);
      }
      callback(null, {
        contextUrl: null,
        document: doc,
        documentUrl: url
      });
    });
  };
};

/* Promises API */

/**
 * Creates a new promises API object.
 *
 * @param [options] the options to use:
 *          [api] an object to attach the API to.
 *
 * @return the promises API object.
 */
api.promises = function(options) {
  options = options || {};
  var slice = Array.prototype.slice;

  // handle 'api' option as version, set defaults
  var papi = options.api || {};
  if(typeof options.api === 'string') {
    papi = {};
  }

  var promiseMethods = ['getDidDocument', 'get'];
  for(var method in api) {
    (function(method) {
      if(promiseMethods.indexOf(method) === -1) {
        papi[method] = api[method];
      } else {
        papi[method] = function() {
          return _promisify.apply(
            null, [api[method]].concat(slice.call(arguments)));
        };
      }
    })(method);
  }

  // special case `createDocumentLoader`
  papi.createDocumentLoader = function() {
    var loader = api.createDocumentLoader.apply(null, arguments);
    return function(url) {
      return _promisify.apply(null, [loader].concat(slice.call(arguments)));
    };
  };

  papi.Promise = api.Promise;
  return papi;
};

// handle dependency injection
(function() {
  var inject = options.inject || {};
  for(var name in inject) {
    api.use(name, inject[name]);
  }
})();

// setup default `.promises` API if promises are in the environment
(function() {
  var hasPromises = !!global.Promise;
  if(!hasPromises) {
    try {
      require('es6-promise');
      hasPromises = true;
    } catch(e) {}
  }
  if(hasPromises) {
    api.promises({api: api.promises});
  }
})();

/**
 * Converts a node.js async op into a promise w/boxed resolved value(s).
 *
 * @param op the operation to convert.
 *
 * @return the promise.
 */
function _promisify(op) {
  if(!api.Promise) {
    try {
      api.Promise = global.Promise || require('es6-promise').Promise;
    } catch(e) {
      throw new Error('Unable to find a Promise implementation.');
    }
  }
  var args = Array.prototype.slice.call(arguments, 1);
  return new api.Promise(function(resolve, reject) {
    op.apply(null, args.concat(function(err, value) {
      if(!err) {
        resolve(value);
      } else {
        reject(err);
      }
    }));
  });
}

return api;

} // end wrap

// used to generate a new API instance
var factory = function(options) {
  return wrap(function() {return factory();}, options);
};
wrap(factory);

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
