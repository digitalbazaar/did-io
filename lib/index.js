/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const Injector = require('./Injector');
const injector = new Injector();

module.exports = {
  use: injector.use,
  methods: {
    veres: require('./methods/veres-one.js')
  }
};
