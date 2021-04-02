# DID Client _(@digitalbazaar/did-io)_

![Node.js CI](https://github.com/digitalbazaar/did-io/workflows/Node.js%20CI/badge.svg)
[![NPM Version](https://img.shields.io/npm/v/digitalbazaar/did-io)](https://www.npmjs.com/package/@digitalbazaar/did-io)

> A [DID](https://w3c-ccg.github.io/did-spec/) (Decentralized Identifier) resolution library for Javascript.

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Supported Drivers](#supported-drivers)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

See also (related specs):

* [DID Core v1](https://w3c.github.io/did-core/)
* [Decentralized Identifier Resolution v2](https://w3c-ccg.github.io/did-resolution/)
* [Veres One DID Method](https://w3c-ccg.github.io/didm-veres-one/)
* [Linked Data Cryptographic Suite Registry](https://w3c-ccg.github.io/ld-cryptosuite-registry/)
* [Linked Data Proofs](https://w3c-dvcg.github.io/ld-proofs/)
* [Object Capabilities for Linked Data](https://w3c-ccg.github.io/ocap-ld/)

## Install

Requires Node.js 12+

To install locally (for development):

```
git clone https://github.com/digitalbazaar/did-io.git
cd did-io
npm install
```

To install as a dependency in another project, add this to your `package.json`:

```
"@digitalbazaar/did-io": "^X.x.x"
```

## Usage

### Using the CachedResolver

```js
import {CachedResolver} from '@digitalbazaar/did-io';

// You can pass cache options to the constructor (see Cache Management below)
const resolver = new CachedResolver({max: 100}); // defaults to 100
```

On its own, the resolver does not know how to fetch or resolve any DID methods.
Support for each one has to be enabled explicitly. It uses a
[Chai](https://www.chaijs.com/)-like plugin architecture, where each driver
is loaded via `.use(driver)`.

```js
import didKey from '@digitalbazaar/did-method-key';
import didVeresOne from 'did-veres-one';

const didKeyDriver = didKey.driver();
const didVeresOneDriver = didVeresOne.driver({mode: 'dev'}); // Dev / testnet / live modes

// Enable resolver to use the did:key and did:v1 methods for cached fetching.
resolver.use(didKeyDriver);
resolver.use(didVeresOneDriver);
```

After enabling individual DID methods, you can `get()` individual
DIDs. CachedResolver will use the appropriate driver, based on the `did:` prefix,
or throw an 'unsupported did method' error if no driver was installed for that
method.

```js
await resolver.get({did}); // -> did document
await resolver.get({url: keyId}); // -> public key node
```

### Using CachedResolver as a `documentLoader`

One of the most common uses of DIDs and their public keys is for cryptographic
operations such as signing and verifying signatures of 
[Verifiable Credentials](https://github.com/digitalbazaar/vc-js) and 
[other documents](https://github.com/digitalbazaar/jsonld-signatures), and for 
[encrypting and decrypting objects](https://github.com/digitalbazaar/minimal-cipher).

For these and other Linked Data Security operations, a `documentLoader` function
is often required. For example, NPM's `package.json` and `package-lock.json`
mechanisms allow application developers to securely lock down a library's
dependencies (by specifying exact content hashes or approximate versions).
In the same manner, `documentLoader`s allow developers to secure their
Linked Data Security load operations, such as when loading JSON-LD contexts,
fetching DID Documents of supported DID methods, retrieving public keys, and
so on.

You can use an initialized `CachedResolver` instance when constructing a
`documentLoader` for your use case (to handle DID and DID key resolution for 
installed methods). For example:

```js
const resolver = new CachedResolver();
resolver.use(didMethodDriver1);
resolver.use(didMethodDriver2);

const documentLoader = async url => {
  // Handle other static document and contexts here...
  
  // Use CachedResolver to fetch did: links.
  if(url && url.startsWith('did:')) {
    // this will handle both DIDs and key IDs for the 2 installed drivers
    const document = await resolver.get({url});
    return {
      url,
      document,
      static: true
    }
  }
}
```

### Generating, Registering or Updating DID Documents


### Cache Management

CachedResolver uses [`lru-memoize`](https://github.com/digitalbazaar/lru-memoize)
to [memoize](https://en.wikipedia.org/wiki/Memoization) `get()` promises 
(as opposed to just the results of the operations),
which helps in high-concurrency use cases. (And that library in turn uses
[`lru-cache`](https://www.npmjs.com/package/lru-cache) under the hood.)

The `CachedResolver` constructor passes any options given to it through to
the `lru-cache` constructor, so  see that repo for the full list of cache 
management options. Commonly used ones include:

* `max` (default: 100) - maximum size of the cache.
* `maxAge` - maximum age of an item in ms.
* `updateAgeOnGet` (default: `false`) - When using time-expiring entries with 
  `maxAge`, setting this to true will make each entry's effective time update to
  the current time whenever it is retrieved from cache, thereby extending the 
  expiration date of the entry.

### Supported Drivers

* [`did:v1`](https://github.com/veres-one/did-veres-one)
* [`did:key`](https://github.com/digitalbazaar/did-method-key-js)
* [`did:web`](https://github.com/interop-alliance/did-web-resolver)

## Contribute

See [the contribute file](https://github.com/digitalbazaar/bedrock/blob/master/CONTRIBUTING.md)!

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

## License

[New BSD License (3-clause)](LICENSE) © Digital Bazaar
