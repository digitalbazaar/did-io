'use strict';

const VeresOne = require('../lib/methods/veres-one/veres-one');
const Injector = require('../lib/Injector');
const injector = new Injector();

// FIXME: determine how to simplify/move this code out of test
const jsonld = injector.use('jsonld');
const documentLoader = jsonld.documentLoader;

jsonld.documentLoader = async url => {
  if(url in VeresOne.contexts) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: VeresOne.contexts[url]
    };
  }
  return documentLoader(url);
};
injector.use('jsonld', jsonld);
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', jsonld);
const eproofs = require('equihash-signature');
eproofs.install(jsigs);
injector.use('jsonld-signatures', jsigs);

injector.env = {nodejs: true};

module.exports = injector;
