/**
 * A WebDHT-based library for managing decentralized identifiers and
 * associated data.
 *
 * @author Manu Sporny <msporny@digitalbazaar.com>
 * @author Dave Longley <dlongley@digitalbazaar.com>
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 *
 * BSD 3-Clause License
 * Copyright (c) 2015-2016 Digital Bazaar, Inc.
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
 *          [baseUrl] the HTTPS baseUrl for resolving DIDs
 *          [inject] *deprecated*, use `use` API instead; the dependencies to
 *            inject, available global defaults will be used otherwise.
 *            [forge] forge API.
 *            [uuid] The uuid API.
 *            [jsonld] jsonld.js API; all remote documents will be loaded
 *              using jsonld.documentLoader by default, so ensure a secure
 *              document loader is configured.
 */
function wrap(api, options) {

// set default options
var defaults = options || {};
if(!('baseUrl' in defaults)) {
  defaults.baseUrl = 'https://authorization.io/dids/';
} else if(typeof defaults.baseUrl !== 'string') {
  throw new TypeError('options.baseUrl must be a string.');
}
if(!('strictSSL' in defaults)) {
  defaults.strictSSL = true;
} else if(typeof defaults.strictSSL !== 'boolean') {
  throw new TypeError('options.strictSSL must be a boolean.');
}
if(!('maxUpdateAttempts' in defaults)) {
  defaults.maxUpdateAttempts = 3;
} else if(typeof defaults.maxUpdateAttempts !== 'number') {
  throw new TypeError('options.maxUpdateAttempts must be a number.');
}

// stores injectable libs
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
      case '_':
        requireName = 'lodash';
        break;
      case 'forge':
        requireName = 'node-forge';
        break;
      case 'jsigs':
        requireName = 'jsonld-signatures';
        break;
      case 'jsonld':
        globalName = 'jsonldjs';
        break;
      case 'uuid':
        requireName = 'uuid';
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
  // FIXME: can't simply bcrypt and then hash; would lose bcrypt parameters
  var forge = api.use('forge');
  var md = forge.md.sha256.create();
  md.update(email + passphrase);
  return 'urn:sha256:' + md.digest().toHex();
};

// old did:uuidv4 style
var didUuidRegex = new RegExp('^did\:[0-9a-f]{8}-[0-9a-f]{4}-' +
  '4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');
// start of generic did scheme before path and fragment
// FIXME: accepts bad trailing ":" before path:
// "did:method:specific:idstring:/path"
var didGenericRegex = /^did:([a-z0-9]+):([A-Za-z0-9.-]+(?::[A-Za-z0-9.-]+)*)/;

/**
 * Validate the format of the given DID.
 *
 * @param did the DID to check.
 *
 * @return true if the DID's format is valid, false if not.
 */
api.validateDidFormat = function(did) {
  return didUuidRegex.test(did) || didGenericRegex.test(did);
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

  // TODO: use `_getOption(options, 'baseUrl', 'string');
  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl;
  if('baseUrl' in options) {
    if(typeof options.baseUrl !== 'string') {
      throw new TypeError('options.baseUrl must be a string.');
    }
    baseUrl = options.baseUrl;
  } else {
    baseUrl = defaults.baseUrl;
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
    throw new TypeError('url must be a string.');
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
        return callback(new TypeError(
          'url must be a string with scheme "did".'));
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

/**
 * Register a DID document.
 *
 * @param [options] the options to use:
 *          [baseUrl] the target endpoint for the request.
 *          [didDocument] the DID document to register.
 *          [privateKeyPem] the private key used to sign to DID document.
 *          [strictSSL] enable/disable strictSSL.
 * @param callback(err) called once the operation completes.
 */
api.registerDid = function(options, callback) {
  var _ = api.use('_');
  var async = api.use('async');
  var jsigs = api.use('jsigs');
  var request = api.use('request');

  // TODO: use `_getOption(options, 'baseUrl', 'string');
  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl;
  if('baseUrl' in options) {
    if(typeof options.baseUrl !== 'string') {
      throw new TypeError('options.baseUrl must be a string.');
    }
    baseUrl = options.baseUrl;
  } else {
    baseUrl = defaults.baseUrl;
  }

  // TODO: use `_getOption(options, 'strictSSL', 'boolean');
  var strictSSL;
  if('strictSSL' in options) {
    strictSSL = !!options.strictSSL;
  } else {
    strictSSL = defaults.strictSSL;
  }

  var did = options.didDocument.id;
  var privateKeyPem = options.privateKeyPem;

  async.auto({
    checkDuplicate: function(callback) {
      // do early duplicate check to prevent proof of patience wait time
      request.get(baseUrl + did, {
        headers: {'Accept': 'application/ld+json'},
        strictSSL: strictSSL
      }, function(err, res) {
        if(err) {
          // ignore early check errors
          return callback();
        }
        if(res.statusCode === 200) {
          // TODO: check that DID document matches
          // DID already registered
          return callback(null, res.body);
        }
        callback();
      });
    },
    sign: ['checkDuplicate', function(callback, results) {
      if(results.checkDuplicate) {
        return callback();
      }
      var didDocument = _.cloneDeep(options.didDocument);
      jsigs.sign(didDocument, {
        algorithm: 'LinkedDataSignature2015',
        creator: didDocument.publicKey[0].id,
        privateKeyPem: privateKeyPem
      }, callback);
    }],
    prove: ['sign', function(callback, results) {
      if(results.checkDuplicate) {
        return callback();
      }
      var o = {
        baseUrl: baseUrl,
        didDocument: results.sign,
        request: request,
        strictSSL: strictSSL
      };
      _establishProofOfPatience(o, callback);
    }],
    register: ['prove', function(callback, results) {
      if(results.checkDuplicate) {
        return callback();
      }
      // registered w/o proof
      if(results.prove.registered) {
        return callback();
      }
      // must register w/proof
      request.post(baseUrl, {
        headers: {
          authorization: results.prove.proof,
          'Content-Type': 'application/ld+json'
        },
        body: JSON.stringify(results.sign),
        strictSSL: strictSSL
      }, function(err, res) {
        if(err) {
          var msg = 'Error registering DID after proof of patience.' +
            ', didRegistrationUrl=' + baseUrl +
            ', cause=' + err.toString();
          var registerDidError = new Error(msg);
          registerDidError.didRegistrationUrl = baseUrl;
          registerDidError.didDocument = results.sign;
          registerDidError.cause = err;
          return callback(registerDidError);
        }
        if(res.statusCode === 409) {
          // response is a conflict, which means it's a duplicate DID;
          // ignore this
          // TODO: check to ensure it's actually the right DID document
          // DID already registered
          return callback();
        }
        if(res.statusCode >= 300) {
          var httpError = new Error('Could not register DID.');
          httpError.httpStatusCode = res.statusCode;
          httpError.status = res.statusCode;
          return callback(httpError);
        }
        // registration for DID complete.
        callback();
      });
    }]
  }, function(err) {
    callback(err);
  });
};

/**
 * Add a new public key to a DID document.
 *
 * TODO: Allow passing of signature function for SSM/HSM.
 *
 * @param options the options to use:
 *          publicKey the public key to register.
 *          signingKey the key information for the key pair to sign with.
 *            id the ID for the key pair.
 *            privateKeyPem the private key material used to sign to DID
 *              document.
 *          [baseUrl] the target endpoint for the request.
 *          [grantWritePermission] true to give the key write permission to
 *            the DID Document, false not to (default: false).
 *          [maxUpdateAttempts] the maximum number of update attempts to try
 *            before quitting.
 *          [strictSSL] enable/disable strictSSL.
 * @param callback(err, publicKey) called once the operation completes.
 */
api.addPublicKey = function(options, callback) {
  var _ = api.use('_');
  var async = api.use('async');
  var jsigs = api.use('jsigs');
  var jsonld = api.use('jsonld');
  var request = api.use('request');
  var uuid = api.use('uuid');
  var done = callback;

  // validate options
  options = _.assign({}, options || {});
  var publicKey = _.assign(
    {id: null}, _getOption(options, 'publicKey', 'object'));
  delete publicKey['@context'];
  _getOption(publicKey, 'owner', 'string');
  _getOption(publicKey, 'publicKeyPem', 'string');

  if(publicKey.owner.indexOf('did:') !== 0) {
    return callback(new Error('Could not register public key; ' +
      'publicKey.owner must be a decentralized identifier.'));
  }

  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl = _getOption(options, 'baseUrl', 'string');
  var strictSSL = _getOption(options, 'strictSSL', 'boolean');
  var maxUpdateAttempts = _getOption(options, 'maxUpdateAttempts', 'number');

  // if update results in a 409 Conflict, retry a number of times
  if(!('_attempts' in options)) {
    options._attempts = 0;
  } else if(options._attempts > maxUpdateAttempts) {
    var error = new Error(
      'Could not register public key; maximum key registration attempts ' +
      'exceeded.');
    error.name = 'MaximumUpdateAttemptsExceeded';
    return done(error);
  }

  async.auto({
    getCurrent: function(callback) {
      api.get(publicKey.owner, options, callback);
    },
    update: ['getCurrent', function(callback, results) {
      // advance update counter
      var doc = results.getCurrent;
      var updateCounter = doc['urn:webdht:updateCounter'] || '0';
      // TODO: needs a BigNumber implementation to work for DID objects
      // with billions of updates
      /*doc['urn:webdht:updateCounter'] = new BigNumber(
        updateCounter).plus(1).toString(10);*/
      doc['urn:webdht:updateCounter'] =
        (parseInt(updateCounter, 10) + 1).toString(10);

      // generate a unique DID-based key ID
      var keys = jsonld.getValues(doc, 'publicKey');
      var id;
      while(!id) {
        id = doc.id + '/keys/' + uuid.v4();
        for(var i = 0; i < keys.length; ++i) {
          if(keys[i].id === id) {
            id = null;
            break;
          }
        }
      }

      // add public key to doc
      // TODO: frame `options.publicKey`? -- currently assumes properly
      // framed and compacted (and will fail validation if not)
      publicKey.id = id;
      jsonld.addValue(doc, 'publicKey', publicKey);

      // add write permission if specified
      if(options.grantWritePermission) {
        jsonld.addValue(doc.accessControl, 'writePermission', {
          id: id,
          type: publicKey.type || 'CryptographicKey'
        });
      }

      // sign the document
      async.auto({
        sign: function(callback) {
          delete doc.signature;
          jsigs.sign(doc, {
            algorithm: 'LinkedDataSignature2015',
            privateKeyPem: options.signingKey.privateKeyPem,
            creator: options.signingKey.id
          }, callback);
        },
        post: ['sign', function(callback, results) {
          request.post({
            url: baseUrl + doc.id,
            headers: {
              'Accept': 'application/ld+json, application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(results.sign),
            strictSSL: strictSSL
          }, function(err, response) {
            if(err) {
              return callback(err);
            }
            if(response.statusCode === 409) {
              return process.nextTick(function() {
                options.attempts = options.attempts + 1;
                api.addPublicKey(options, done);
              });
            }
            if(response.statusCode >= 400) {
              var error = new Error(
                'Could not register public key; ' +
                'HTTP response code: ' + response.statusCode);
              error.name = 'KeyRegistrationError';
              return callback(error);
            }
            callback();
          });
        }]
      }, function(err) {
        callback(err, publicKey);
      });
    }]
  }, function(err, results) {
    done(err, err ? null : results.update);
  });
};

/**
 * Removes a public key from a DID document. A public key cannot remove
 * itself from a document, it must be done by another key.
 *
 * TODO: Allow passing of signature function for SSM/HSM.
 * TODO: Add a `revoke` public key function.
 *
 * @param options the options to use:
 *          id the decentralized identifier of the DID document to update.
 *          publicKeyId the ID of the public key to remove.
 *          signingKey the key information for the key pair to sign with.
 *            id the ID for the key pair.
 *            privateKeyPem the private key material used to sign to DID
 *              document.
 *          [baseUrl] the target endpoint for the request.
 *          [maxUpdateAttempts] the maximum number of update attempts to try
 *            before quitting.
 *          [strictSSL] enable/disable strictSSL.
 * @param callback(err) called once the operation completes.
 */
api.removePublicKey = function(options, callback) {
  var _ = api.use('_');
  var async = api.use('async');
  var jsigs = api.use('jsigs');
  var jsonld = api.use('jsonld');
  var request = api.use('request');
  var done = callback;

  // validate options
  options = _.assign({}, options || {});
  var signingKey = _getOption(options, 'signingKey', 'object');
  _getOption(signingKey, 'id', 'string');
  _getOption(signingKey, 'privateKeyPem', 'string');
  var id = _getOption(options, 'id', 'string');
  var publicKeyId = _getOption(options, 'publicKeyId', 'string');

  // TODO: add flag to allow this
  if(signingKey.id === publicKeyId) {
    var error = Error(
      'Could not remove public key; a key cannot be used to remove itself.');
    error.name = 'KeySelfRemovalError';
    return callback(error);
  }

  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl = _getOption(options, 'baseUrl', 'string');
  var strictSSL = _getOption(options, 'strictSSL', 'boolean');
  var maxUpdateAttempts = _getOption(options, 'maxUpdateAttempts', 'number');

  // if update results in a 409 Conflict, retry a number of times
  if(!('_attempts' in options)) {
    options._attempts = 0;
  } else if(options._attempts > maxUpdateAttempts) {
    var error = new Error(
      'Could not remove public key; maximum key removal attempts ' +
      'exceeded.');
    error.name = 'MaximumUpdateAttemptsExceeded';
    return done(error);
  }

  async.auto({
    getCurrent: function(callback) {
      api.get(id, options, callback);
    },
    update: ['getCurrent', function(callback, results) {
      // advance update counter
      var doc = results.getCurrent;
      var updateCounter = doc['urn:webdht:updateCounter'] || '0';
      // TODO: needs a BigNumber implementation to work for DID objects
      // with billions of updates
      /*doc['urn:webdht:updateCounter'] = new BigNumber(
        updateCounter).plus(1).toString(10);*/
      doc['urn:webdht:updateCounter'] =
        (parseInt(updateCounter, 10) + 1).toString(10);

      // remove key from doc
      var keys = jsonld.getValues(doc, 'publicKey');
      var length = keys.length;
      doc.publicKey = keys.filter(function(key) {
        return (key.id !== publicKeyId);
      });
      if(doc.publicKey.length === length) {
        var error = new Error(
          'Could not remove public key; key not found.');
        error.name = 'NotFound';
        return callback(error);
      }

      // remove key from write permission
      var wp = jsonld.getValues(doc.accessControl, 'writePermission');
      doc.accessControl.writePermission = wp.filter(function(entry) {
        return entry.id !== publicKeyId;
      });

      // sign the document
      async.auto({
        sign: function(callback) {
          delete doc.signature;
          jsigs.sign(doc, {
            algorithm: 'LinkedDataSignature2015',
            privateKeyPem: options.signingKey.privateKeyPem,
            creator: options.signingKey.id
          }, callback);
        },
        post: ['sign', function(callback, results) {
          request.post({
            url: baseUrl + doc.id,
            headers: {
              'Accept': 'application/ld+json, application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(results.sign),
            strictSSL: strictSSL
          }, function(err, response) {
            if(err) {
              return callback(err);
            }
            if(response.statusCode === 409) {
              return process.nextTick(function() {
                options.attempts = options.attempts + 1;
                api.addPublicKey(options, done);
              });
            }
            if(response.statusCode >= 400) {
              var error = new Error(
                'Could not remove public key; ' +
                'HTTP response code: ' + response.statusCode);
              error.name = 'KeyRemovalError';
              return callback(error);
            }
            callback();
          });
        }]
      }, function(err) {
        callback(err);
      });
    }]
  }, function(err) {
    done(err);
  });
};

/**
 * Sets the URL associated with a DID document.
 *
 * TODO: Allow passing of signature function for SSM/HSM.
 *
 * @param options the options to use:
 *          id the decentralized identifier of the DID document to update.
 *          url the new URL value to set, null to remove it.
 *          [baseUrl] the target endpoint for the request.
 *          [maxUpdateAttempts] the maximum number of update attempts to try
 *            before quitting.
 *          [strictSSL] enable/disable strictSSL.
 * @param callback(err, publicKey) called once the operation completes.
 */
api.setUrl = function(options, callback) {
  var _ = api.use('_');
  var async = api.use('async');
  var jsigs = api.use('jsigs');
  var request = api.use('request');
  var done = callback;

  // validate options
  options = _.assign({}, options || {});
  var id = _getOption(options, 'id', 'string');
  var url = null;
  if(options.url !== null) {
    url = _getOption(options, 'url', 'string');
  }

  // TODO: may need to also support passing a function to generate the baseUrl
  var baseUrl = _getOption(options, 'baseUrl', 'string');
  var strictSSL = _getOption(options, 'strictSSL', 'boolean');
  var maxUpdateAttempts = _getOption(options, 'maxUpdateAttempts', 'number');

  // if update results in a 409 Conflict, retry a number of times
  if(!('_attempts' in options)) {
    options._attempts = 0;
  } else if(options._attempts > maxUpdateAttempts) {
    var error = new Error(
      'Could not set URL; maximum key registration attempts ' +
      'exceeded.');
    error.name = 'MaximumUpdateAttemptsExceeded';
    return done(error);
  }

  async.auto({
    getCurrent: function(callback) {
      api.get(id, options, callback);
    },
    update: ['getCurrent', function(callback, results) {
      // advance update counter
      var doc = results.getCurrent;
      var updateCounter = doc['urn:webdht:updateCounter'] || '0';
      // TODO: needs a BigNumber implementation to work for DID objects
      // with billions of updates
      /*doc['urn:webdht:updateCounter'] = new BigNumber(
        updateCounter).plus(1).toString(10);*/
      doc['urn:webdht:updateCounter'] =
        (parseInt(updateCounter, 10) + 1).toString(10);

      // set URL value
      if(url === null) {
        delete doc.url;
      } else {
        doc.url = url;
      }

      // sign the document
      async.auto({
        sign: function(callback) {
          delete doc.signature;
          jsigs.sign(doc, {
            algorithm: 'LinkedDataSignature2015',
            privateKeyPem: options.signingKey.privateKeyPem,
            creator: options.signingKey.id
          }, callback);
        },
        post: ['sign', function(callback, results) {
          request.post({
            url: baseUrl + doc.id,
            headers: {
              'Accept': 'application/ld+json, application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(results.sign),
            strictSSL: strictSSL
          }, function(err, response) {
            if(err) {
              return callback(err);
            }
            if(response.statusCode === 409) {
              return process.nextTick(function() {
                options.attempts = options.attempts + 1;
                api.addPublicKey(options, done);
              });
            }
            if(response.statusCode >= 400) {
              var error = new Error(
                'Could not set URL; ' +
                'HTTP response code: ' + response.statusCode);
              error.name = 'SetUrlError';
              return callback(error);
            }
            callback();
          });
        }]
      }, function(err) {
        callback(err);
      });
    }]
  }, function(err) {
    done(err);
  });
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

  var promiseMethods = [
    'getDidDocument', 'get', 'registerDid', 'addPublicKey', 'removePublicKey'];
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

function _getOption(options, name, type) {
  if(typeof options[name] === type) {
    return options[name];
  }
  if(name in options || !(name in defaults)) {
    throw new TypeError('options.' + name + ' must be type "' + type + '".');
  }
  return defaults[name];
}

// handle dependency injection
(function() {
  var inject = defaults.inject || {};
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
 * Helper function to establish a proof of patience for registering a DID.
 *
 * @param [options] the options to use:
 *          [baseUrl] the target endpoint for the request.
 *          [request] instance of the request library.
 *          [didDocument] the DID document to register.
 *          [strictSSL] enable/disable strictSSL.
 * @param callback(err, result) called once the operation completes.
 */
function _establishProofOfPatience(options, callback) {
  var request = options.request;
  request.post(options.baseUrl, {
    headers: {'Content-Type': 'application/ld+json'},
    body: JSON.stringify(options.didDocument),
    strictSSL: options.strictSSL
  }, function(err, res) {
    if(err) {
      var msg = 'Error establishing proof of patience.' +
        ', didRegistrationUrl=' + options.baseUrl +
        ', cause=' + err.toString();
      var registerDidError = new Error(msg);
      registerDidError.didRegistrationUrl = options.baseUrl;
      registerDidError.didDocument = options.didDocument;
      registerDidError.cause = err;
      return callback(registerDidError);
    }
    // success
    if(res.statusCode < 300) {
      return callback(null, {registered: true});
    }
    // if not a 401 HTTP error code w/proof-of-patience then bail
    if(!(res.statusCode === 401 &&
      'retry-after' in res.headers &&
      'www-authenticate' in res.headers)) {
      var httpError = new Error('Could not register DID.');
      httpError.httpStatusCode = res.statusCode;
      httpError.status = res.statusCode;
      return callback(httpError);
    }

    var secondsLeft = parseInt(res.headers['retry-after'], 10);
    // providing proof of patience to register DID
    // TODO: validate seconds left, if it's too long, raise an error
    setTimeout(function() {
      var proof = res.headers['www-authenticate'];
      callback(null, {
        registered: false,
        proof: proof
      });
    }, secondsLeft * 1000);
  });
}

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
