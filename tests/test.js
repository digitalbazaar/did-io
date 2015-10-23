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

var MOCK_DOCS = _mockDocs();

if(_nodejs) {
  var _jsdir = process.env.JSDIR || 'lib';
  var didio = require('../' + _jsdir + '/did-io');
  var program = require('commander');
  var should = require('chai').should();
  var jsonld = require('jsonld');
  // mock document loader
  var documentLoader = jsonld.documentLoader;
  jsonld.documentLoader = function(url, callback) {
    if(url in MOCK_DOCS) {
      return callback(
        null, {
          contextUrl: null,
          document: MOCK_DOCS[url],
          documentUrl: url
        });
    }
    documentLoader(url, callback);
  };
  didio.use('jsonld', jsonld);
  program
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
} else {
  var system = require('system');
  require('./bind');
  require('./setImmediate');
  var _jsdir = system.env.JSDIR || 'lib';
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
  require('mocha/mocha');
  require('mocha-phantomjs/lib/mocha-phantomjs/core_extensions');

  // PhantomJS is really bad at doing XHRs, so we have to fake the network
  // fetch of the JSON-LD Contexts
  jsonld.documentLoader = function(url, callback) {
    if(url in MOCK_DOCS) {
      return callback(null, {
        contextUrl: null,
        document: MOCK_DOCS[url],
        documentUrl: url
      });
    }
    var err = new Error('Not found.');
    err.status = 404;
    callback(err);
  };
  didio.use('jsonld', jsonld);

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

  describe('get Function', function() {
    it('should retrieve a DID document', function(done) {
      var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
      didio.get(did, function(err, doc) {
        should.not.exist(err);
        should.exist(doc);
        doc.idp.should.equal('did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
        done();
      });
    });

    it('should err on unknown DID document', function(done) {
      var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
      didio.get(did, function(err, doc) {
        should.exist(err);
        err.status.should.equal(404);
        done();
      });
    });

    it('should retrieve a DID document public key', function(done) {
      var key = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1';
      didio.get(key, function(err, doc) {
        should.not.exist(err);
        should.exist(doc);
        doc.id.should.equal('did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1');
        doc.owner.should.equal('did:32e89321-a5f1-48ff-8ec8-a4112be1215c');
        done();
      });
    });
  });

  describe('JSON-LD document loader', function() {
    it('should retrieve a DID document', function(done) {
      var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
      var loader = didio.createDocumentLoader();
      loader(did, function(err, remoteDoc) {
        should.not.exist(err);
        should.exist(remoteDoc);
        should.exist(remoteDoc.document);
        remoteDoc.document.idp.should.equal(
          'did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
        done();
      });
    });

    it('should err on unknown DID document', function(done) {
      var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
      var loader = didio.createDocumentLoader();
      loader(did, function(err, remoteDoc) {
        should.exist(err);
        err.status.should.equal(404);
        done();
      });
    });

    it('should retrieve a DID document public key', function(done) {
      var key = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1';
      var loader = didio.createDocumentLoader();
      loader(key, function(err, remoteDoc) {
        should.not.exist(err);
        should.exist(remoteDoc);
        should.exist(remoteDoc.document);
        remoteDoc.document.id.should.equal(
          'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1');
        remoteDoc.document.owner.should.equal(
          'did:32e89321-a5f1-48ff-8ec8-a4112be1215c');
        done();
      });
    });
  });

  describe('promise API', function() {
    describe('getDidDocument Function', function() {
      it('should retrieve a DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
        didio.promises.getDidDocument(did).then(function(doc) {
          should.exist(doc);
          doc.idp.should.equal('did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
          done();
        });
      });

      it('should err on unknown DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
        didio.promises.getDidDocument(did).catch(function(err) {
          return err;
        }).then(function(err) {
          should.exist(err);
          err.status.should.equal(404);
          done();
        });
      });
    });

    describe('get Function', function() {
      it('should retrieve a DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
        didio.promises.get(did).then(function(doc) {
          should.exist(doc);
          doc.idp.should.equal('did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
          done();
        });
      });

      it('should err on unknown DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
        didio.promises.get(did).catch(function(err) {
          return err;
        }).then(function(err) {
          should.exist(err);
          err.status.should.equal(404);
          done();
        });
      });

      it('should retrieve a DID document public key', function(done) {
        var key = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1';
        didio.promises.get(key).then(function(doc) {
          should.exist(doc);
          doc.id.should.equal('did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1');
          doc.owner.should.equal('did:32e89321-a5f1-48ff-8ec8-a4112be1215c');
          done();
        });
      });
    });

    describe('JSON-LD document loader', function() {
      it('should retrieve a DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c';
        var loader = didio.promises.createDocumentLoader();
        loader(did).then(function(remoteDoc) {
          should.exist(remoteDoc);
          remoteDoc.document.idp.should.equal(
            'did:bef5ac6a-ca9c-4548-8179-76b44692bb86');
          done();
        });
      });

      it('should err on unknown DID document', function(done) {
        var did = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215d';
        var loader = didio.promises.createDocumentLoader();
        loader(did).catch(function(err) {
          return err;
        }).then(function(err) {
          should.exist(err);
          err.status.should.equal(404);
          done();
        });
      });

      it('should retrieve a DID document public key', function(done) {
        var key = 'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1';
        var loader = didio.promises.createDocumentLoader();
        loader(key).then(function(remoteDoc) {
          should.exist(remoteDoc);
          should.exist(remoteDoc.document);
          remoteDoc.document.id.should.equal(
            'did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1');
          remoteDoc.document.owner.should.equal(
            'did:32e89321-a5f1-48ff-8ec8-a4112be1215c');
          done();
        });
      });
    });
  });
});

if(!_nodejs) {
  mocha.run(function() {
    phantom.exit();
  });
}

function _mockDocs() {
  // documents to mock load
  var MOCK_DOCS = {
    'https://w3id.org/security/v1': {
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
    },
    'https://w3id.org/identity/v1': {
      "@context": {
        "id": "@id",
        "type": "@type",

        "dc": "http://purl.org/dc/terms/",
        "identity": "https://w3id.org/identity#",
        "ps": "https://w3id.org/payswarm#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "sec": "https://w3id.org/security#",
        "schema": "http://schema.org/",
        "xsd": "http://www.w3.org/2001/XMLSchema#",

        "about": {"@id": "schema:about", "@type": "@id"},
        "address": {"@id": "schema:address", "@type": "@id"},
        "addressCountry": "schema:addressCountry",
        "addressLocality": "schema:addressLocality",
        "addressRegion": "schema:addressRegion",
        "comment": "rdfs:comment",
        "created": {"@id": "dc:created", "@type": "xsd:dateTime"},
        "creator": {"@id": "dc:creator", "@type": "@id"},
        "description": "schema:description",
        "email": "schema:email",
        "familyName": "schema:familyName",
        "givenName": "schema:givenName",
        "image": {"@id": "schema:image", "@type": "@id"},
        "label": "rdfs:label",
        "name": "schema:name",
        "postalCode": "schema:postalCode",
        "streetAddress": "schema:streetAddress",
        "title": "dc:title",
        "url": {"@id": "schema:url", "@type": "@id"},
        "PostalAddress": "schema:PostalAddress",

        "Identity": "identity:Identity",
        "Person": "schema:Person",
        "Organization": "schema:Organization",

        "paymentProcessor": "ps:processor",

        "preferences": {"@id": "ps:preferences", "@type": "@vocab"},

        "credential": {"@id": "sec:credential", "@type": "@id"},
        "cipherAlgorithm": "sec:cipherAlgorithm",
        "cipherData": "sec:cipherData",
        "cipherKey": "sec:cipherKey",
        "claim": {"@id": "sec:claim", "@type": "@id"},
        "digestAlgorithm": "sec:digestAlgorithm",
        "digestValue": "sec:digestValue",
        "domain": "sec:domain",
        "expires": {"@id": "sec:expiration", "@type": "xsd:dateTime"},
        "identityService": {"@id": "identity:identityService", "@type": "@id"},
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
        "signatureAlgorithm": "sec:signatureAlgorithm",
        "signatureValue": "sec:signatureValue",
        "EncryptedMessage": "sec:EncryptedMessage",
        "CryptographicKey": "sec:Key",
        "GraphSignature2012": "sec:GraphSignature2012"
      }
    }
  };
  var mockConfig = require('./mock.config');
  MOCK_DOCS['https://authorization.io/dids/' + mockConfig.didDocument.id] =
    mockConfig.didDocument;
  return MOCK_DOCS;
}

})();
