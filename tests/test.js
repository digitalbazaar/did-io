/**
 * Test runner for DID I/O library.
 *
 * @author Dave Longley <dlongley@digitalbazaar.com>
 * @author Manu Sporny <msporny@digitalbazaar.com>
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
(function() {

'use strict';

// detect node.js (vs. phantomJS)
var _nodejs = (typeof process !== 'undefined' &&
  process.versions && process.versions.node);

if(_nodejs) {
  var _jsdir = process.env.JSDIR || 'lib';
  var didio = require('../' + _jsdir + '/did-io')();
  var assert = require('assert');
  var program = require('commander');
  program
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
} else {
  var system = require('system');
  require('./setImmediate');
  var _jsdir = system.env.JSDIR || 'lib';
  var async = require('async');
  window.async = async;
  var forge = require('../node_modules/node-forge');
  window.forge = forge;
  require('../node_modules/jsonld');
  var jsonld = jsonldjs;
  window.Promise = require('es6-promise').Promise;
  var assert = require('chai').assert;
  require('mocha/mocha');
  require('mocha-phantomjs/lib/mocha-phantomjs/core_extensions');

  // PhantomJS is really bad at doing XHRs, so we have to fake the network
  // fetch of the JSON-LD Contexts
  var contextLoader = function(url, callback) {
    if(url === 'https://w3id.org/security/v1') {
      callback(null, {
        contextUrl: null,
        document: securityContext,
        documentUrl: 'https://web-payments.org/contexts/security-v1.jsonld'
      });
    }
  };
  jsonld.documentLoader = contextLoader;

  var program = {};
  for(var i = 0; i < system.args.length; ++i) {
    var arg = system.args[i];
    if(arg.indexOf('--') === 0) {
      var argname = arg.substr(2);
      switch(argname) {
      default:
        program[argname] = true;
      }
    }
  }

  mocha.setup({
    reporter: 'spec',
    ui: 'bdd'
  });
}

// run tests
describe('did-io', function() {

  describe('DID generation', function() {

    it('should create a unique ID', function(done) {
      done();
    });

  });
});

if(!_nodejs) {
  mocha.run(function() {
    phantom.exit();
  });
}

// the security context that is used when loading https://w3id.org/security/v1
var securityContext = {
  "@context": {
    "id": "@id",
    "type": "@type",

    "dc": "http://purl.org/dc/terms/",
    "sec": "https://w3id.org/security#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",

    "EncryptedMessage": "sec:EncryptedMessage",
    "GraphSignature2012": "sec:GraphSignature2012",
    "CryptographicKey": "sec:Key",

    "credential": {"@id": "sec:credential", "@type": "@id"},
    "cipherAlgorithm": "sec:cipherAlgorithm",
    "cipherData": "sec:cipherData",
    "cipherKey": "sec:cipherKey",
    "claim": {"@id": "sec:claim", "@type": "@id"},
    "created": {"@id": "dc:created", "@type": "xsd:dateTime"},
    "creator": {"@id": "dc:creator", "@type": "@id"},
    "digestAlgorithm": "sec:digestAlgorithm",
    "digestValue": "sec:digestValue",
    "domain": "sec:domain",
    "encryptionKey": "sec:encryptionKey",
    "expiration": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "initializationVector": "sec:initializationVector",
    "nonce": "sec:nonce",
    "normalizationAlgorithm": "sec:normalizationAlgorithm",
    "owner": {"@id": "sec:owner", "@type": "@id"},
    "password": "sec:password",
    "privateKey": {"@id": "sec:privateKey", "@type": "@id"},
    "privateKeyPem": "sec:privateKeyPem",
    "publicKey": {"@id": "sec:publicKey", "@type": "@id"},
    "publicKeyPem": "sec:publicKeyPem",
    "publicKeyService": {"@id": "sec:publicKeyService", "@type": "@id"},
    "revoked": {"@id": "sec:revoked", "@type": "xsd:dateTime"},
    "signature": "sec:signature",
    "signatureAlgorithm": "sec:signingAlgorithm",
    "signatureValue": "sec:signatureValue"
  }
};

})();
