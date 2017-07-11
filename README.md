did-io
=================

[![Build Status](https://travis-ci.org/digitalbazaar/did-io.png?branch=master)](https://travis-ci.org/digitalbazaar/did-io)

A WebDHT-based library for managing decentralized identifiers and
associated data.

Commercial Support
------------------

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

Source
------

The source code for the JavaScript implementation is available at:

https://github.com/digitalbazaar/did-io

Tests
-----

This library includes a sample testing utility which may be used to verify
that changes to the library maintains the correct output.

To run the sample tests you will need to get the test suite files by cloning
the [did-io repository][did-io] hosted on GitHub.

https://github.com/digitalbazaar/did-io/

Run the tests using the following command:

    npm run test

The standard tests will run node and browser tests. Just one type can also
be run:

    npm run test-node
    npm run test-browser

Code coverage of node tests can be generated in `coverage/`:

    npm run coverage

[did-io]: https://github.com/digitalbazaar/did-io/
