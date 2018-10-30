/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const tls = require('tls');
tls.DEFAULT_ECDH_CURVE = 'auto';

const Injector = require('./Injector');
const injector = new Injector();

const jsigs = require('jsonld-signatures');
const eproofs = require('equihash-signature');
eproofs.install(jsigs);
injector.use('jsonld-signatures', jsigs);

injector.env = {nodejs: true};

const {VeresOne} = require('did-veres-one');

module.exports = {
  injector,
  use: (name, injectable) => injector.use(name, injectable),
  methods: {
    veres: (options) => {
      return new VeresOne({injector, ...options});
    }
  }
};
