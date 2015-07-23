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
  var should = require('chai').should();
  var superagent = require('superagent');
  var mockConfig = require('./mock.config.js');
  require('superagent-mock')(superagent, mockConfig);
  program
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
} else {
  var system = require('system');
  require('./bind');
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
  var should = require('chai').should();
  window.should = require('should').should();
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
      didRegex.test(did).should.equal(true);
      done();
    });

  });

  describe('hash generation', function() {

    it('should create a well-formed hash', function(done) {
      var hash = didio.generateHash('test@example.com', 'Big52TestPassphrase');
      should.exist(hash);
      hash.should.equal(
        'urn:sha256:ebd63d3bcba72e30277bff6792955e4a450f09e9cc29ddc317205a' +
        '3cc70f2b42');
      done();
    });

  });

  describe('getDidDocument Function', function() {
      it('should retrieve a DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
        didio.getDidDocument(did, function(err, doc) {
          should.not.exist(err);
          should.exist(doc);
          doc.idp.should.equal('did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
          done();
        });
      });

      it('should err on unknown DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
        didio.getDidDocument(did, function(err, doc) {
          should.exist(err);
          err.status.should.equal(404);
          done();
        });
      });
  });

  describe('promise API', function() {

    it('should support all static API methods', function(done) {
      // FIXME: promise API generation is currently broken and should be fixed
      var didiop = didio.promises();
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

    "authenticationTag": "sec:authenticationTag",
    "cipherAlgorithm": "sec:cipherAlgorithm",
    "cipherData": "sec:cipherData",
    "cipherKey": "sec:cipherKey",
    "claim": {"@id": "sec:claim", "@type": "@id"},
    "created": {"@id": "dc:created", "@type": "xsd:dateTime"},
    "creator": {"@id": "dc:creator", "@type": "@id"},
    "credential": {"@id": "sec:credential", "@type": "@id"},
    "digestAlgorithm": "sec:digestAlgorithm",
    "digestValue": "sec:digestValue",
    "domain": "sec:domain",
    "encryptionKey": "sec:encryptionKey",
    "expiration": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
    "initializationVector": "sec:initializationVector",
    "iterationCount": "sec:iterationCount",
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
