# Selective DID Resolver Client _(@digitalbazaar/did-io)_

<!--[![Build status](https://img.shields.io/github/workflow/status/digitalbazaar/did-io/Node.js%20CI)](https://github.com/digitalbazaar/did-io/actions?query=workflow%3A%22Node.js+CI%22)
[![Coverage status](https://img.shields.io/codecov/c/github/digitalbazaar/did-io)](https://codecov.io/gh/digitalbazaar/did-io)-->
[![NPM Version](https://img.shields.io/npm/v/@digitalbazaar/did-io.svg)](https://npm.im/@digitalbazaar/did-io)

> A [DID](https://w3c.github.io/did-core) (Decentralized Identifier) resolution library for Javascript.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
  - [Supported DID method drivers](#supported-did-method-drivers)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

See also (related specs):

* [DID Core v1](https://w3c.github.io/did-core)
* [Decentralized Identifier Resolution v2](https://w3c-ccg.github.io/did-resolution/)
* [DID Specification Registries](https://www.w3.org/TR/did-spec-registries/)
* [Linked Data Cryptographic Suite Registry](https://w3c-ccg.github.io/ld-cryptosuite-registry/)
* [Linked Data Proofs](https://w3c-ccg.github.io/ld-proofs/)
* [Authorization Capabilities (zCaps) for Linked Data](https://w3c-ccg.github.io/zcap-ld/)

### Version Compatibility

`did-io` v1.0 is a major breaking release, see the
[1.0 CHANGELOG entry](CHANGELOG.md#100---2021-04-06) and
[Upgrading from v0.8.x to v1.0.0](docs/upgrading-0.8-to-1.0.md) checklist for
details.

`did-io` v1.0 is compatible with the following libraries:

* `crypto-ld` `>= 5.0.0` (and related crypto suites).
* `jsonld-signatures` `>= 9.0.0`
* `@digitalbazaar/did-method-key` `>= 1.0.0`
* `did-veres-one` `>= 13.0.0` (currently, [branch `v13.x`](https://github.com/veres-one/did-veres-one/pull/56))
* `vc-js` `>= 7.0` (currently, [branch `v7.x`](https://github.com/digitalbazaar/vc-js/pull/83))

## Install

Requires Node.js 14+

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

### Supported DID method drivers

* [`did:v1`](https://github.com/veres-one/did-veres-one)
* [`did:key`](https://github.com/digitalbazaar/did-method-key-js)
* [`did:web`](https://github.com/interop-alliance/did-web-resolver)

### Using the CachedResolver to `get()` DID documents and keys

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
import * as didKey from '@digitalbazaar/did-method-key';
import * as didVeresOne from 'did-veres-one';

const didKeyDriver = didKey.driver();
// Dev / testnet / live modes
const didVeresOneDriver = didVeresOne.driver({mode: 'dev'});

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

### Key Convenience Methods

You can use the provided convenience methods (`methodFor()` with
`.generate()`,  and `didMethodDriver.publicMethodFor()` with `.get()`) to get a
hold of key pair instances (previously, this was done via a manual process of
determining key id and using `didDocument.keys[keyId]`).

When retrieving documents with `.get()`:

```js
const didDocument = await resolver.get({did});
const publicKeyData = resolver.publicMethodFor({didDocument, purpose: 'authentication'});
// Then you can use the resulting plain JS object to get a key pair instance.
// via a configured CryptoLD instance, when you're working with multiple key types
// (see `crypto-ld` library for setup and usage):
const authPublicKey = await cryptoLd.from(publicKeyData);
// or, directly (if you already know the key type)
const authPublicKey = await Ed25519VerificationKey2020.from(publicKeyData);
```

When retrieving individual key objects with a `.get()`, you don't even need to
use `publicMethodFor()`:

```js
const keyData = await resolver.get({url: keyId});
const publicKey = await cryptoLd.from(keyData);
```

### Generating and registering DIDs and DID documents

`did-io` and `CachedResolver` are currently only for `get()` operations
on multiple DID methods. To generate and register new DIDs or DID documents,
use each individual driver's `.generate()` method. (The generation
and registration process for each DID method is so different, that it didn't
make sense to unify them on the `CachedResolver` level.)

Each driver's `.generate()` returns a tuple of `didDocument`, a `Map`
of public/private key pairs (by key id), and a convenience `methodFor` function
that allows lookup of key (verification method) by its intended purpose.

```js
const {didDocument, keyPairs, methodFor} = await didMethodDriver.generate();
didDocument
// -> plain JS object, representing a DID document.
keyPairs
// -> a javascript Map of public/private LDKeyPair instances (from crypto-ld),
//   by key id
methodFor({purpose: 'keyAgreement'});
// for example, an X25519KeyAgreementKey2020 key pair instance, that can
// be used for encryption/decryption using `@digitalbazaar/minimal-cipher`.
methodFor({purpose: 'assertionMethod'});
// for example, an Ed25519VerificationKey2020 key pair instance for
// signing and verifying Verifiable Claims (VCs).
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

### Cache management

CachedResolver uses [`lru-memoize`](https://github.com/digitalbazaar/lru-memoize)
to [memoize](https://en.wikipedia.org/wiki/Memoization) `get()` promises 
(as opposed to just the results of the operations),
which helps in high-concurrency use cases. (And that library in turn uses
[`lru-cache`](https://www.npmjs.com/package/lru-cache) under the hood.)

The `CachedResolver` constructor passes any options given to it through to
the `lru-cache` constructor, so  see that repo for the full list of cache 
management options. Commonly used ones include:

* `max` (default: 100) - maximum size of the cache.
* `maxAge` (default: 5 sec/5000 ms) - maximum age of an item in ms.
* `updateAgeOnGet` (default: `false`) - When using time-expiring entries with 
  `maxAge`, setting this to true will make each entry's effective time update to
  the current time whenever it is retrieved from cache, thereby extending the 
  expiration date of the entry.

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
