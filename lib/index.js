/*!
 * Copyright (c) 2018-2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {DidResolver} = require('./DidResolver');

module.exports = {
  didIo: (new DidResolver({}))
};
