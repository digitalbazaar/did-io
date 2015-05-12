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
  var program = require('commander');
  var should = require('should');
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
  var uuid = require('node-uuid');
  window.uuid = uuid;
  require('../' + _jsdir + '/did-io');
  var didio = window.didio;
  window.Promise = require('es6-promise').Promise;
  var should = require('should');
  window.should = require('should');
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
  var did = didio.generateDid();

  describe('DID generation', function() {

    it('should create a well-formed DID', function(done) {
      var didRegex = new RegExp('^did\:[0-9a-f]{8}-[0-9a-f]{4}-' +
        '4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'i');
      should.exist(did);
      should(didRegex.test(did)).be.true;
      done();
    });

  });

  describe('hash generation', function() {

    it('should create a well-formed hash', function(done) {
      var hash = didio.generateHash('test@example.com', 'Big52TestPassphrase');
      should.exist(hash);
      hash.should.be.exactly(
        'ebd63d3bcba72e30277bff6792955e4a450f09e9cc29ddc317205a3cc70f2b42');
      done();
    });

  });

  describe('cryptography', function() {
    var encryptedMessage = {};

    it('should encrypt a DID', function(done) {
      encryptedMessage = didio.encrypt(did, 'Big52TestPassphrase');
      encryptedMessage.should.have.property('cipherData');
      done();
    });

    it('should decrypt a DID', function(done) {
      var decryptedDid = didio.decrypt(encryptedMessage, 'Big52TestPassphrase');
      should.exist(decryptedDid);
      should(decryptedDid).be.exactly(did);
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

    "cipherAlgorithm": "sec:cipherAlgorithm",
    "cipherAuthTag": "sec:cipherAuthTag",
    "cipherData": "sec:cipherData",
    "cipherKey": "sec:cipherKey",
    "claim": {"@id": "sec:claim", "@type": "@id"},
    "credential": {"@id": "sec:credential", "@type": "@id"},
    "created": {"@id": "dc:created", "@type": "xsd:dateTime"},
    "creator": {"@id": "dc:creator", "@type": "@id"},
    "digestAlgorithm": "sec:digestAlgorithm",
    "digestValue": "sec:digestValue",
    "domain": "sec:domain",
    "encryptionKey": "sec:encryptionKey",
    "expiration": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "initializationVector": "sec:initializationVector",
    "iterations": "sec:iterations",
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
    "salt": "sec:salt",
    "signature": "sec:signature",
    "signatureAlgorithm": "sec:signingAlgorithm",
    "signatureValue": "sec:signatureValue"
  }
};

})();
