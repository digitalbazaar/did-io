did-io
=================

[![Build Status](https://travis-ci.org/digitalbazaar/did-io.png?branch=master)](https://travis-ci.org/digitalbazaar/did-io)

A Decentralized Identifier resolution library for the browser and
node.js.

Install
-------

## Requiring jsonld.js:

### node.js + npm

```
npm install did-io
```

```js
var didio = require('did-io');
```

### JSPM

```
jspm install npm:did-io
```

``` js
import * as didio from 'did-io';
```


Quick Examples
--------------

Retrieve a DID document:

```javascript
const did = 'did:example:521a0c21-7816-47f8-bc07-1de5b89385fb';

didio.get(did, (err, doc) => {
  if(err) {
    console.log('Failed to get DID Document:', err);
  }
  
  console.log('Successfully retrieved DID Document:', JSON.stringify(doc, null, 2));
});
```

Retrieve a public key from a DID document:

```javascript
const keyId = 'did:example:521a0c21-7816-47f8-bc07-1de5b89385fb/keys/123';

didio.get(keyId, (err, doc) => {
  if(err) {
    console.log('Failed to get key description:', err);
  }
  
  console.log('Successfully retrieved key:', JSON.stringify(doc, null, 2));
});
```

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
