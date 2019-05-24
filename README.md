# DID Client _(did-io)_

[![Build Status](https://travis-ci.org/digitalbazaar/did-io.png?branch=master)](https://travis-ci.org/digitalbazaar/did-io)

> A [DID](https://w3c-ccg.github.io/did-spec/) (Decentralized Identifier) resolution library for Javascript

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Supported Drivers](#supported-drivers)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Security

TBD

## Background

TBD

See also (related specs):

* [Decentralized Identifiers (DIDs) - Data Model and Syntaxes](https://w3c-ccg.github.io/did-spec/)
* [Veres One DID Method](https://w3c-ccg.github.io/didm-veres-one/)
* [Web Ledger Protocol](https://w3c.github.io/web-ledger/)
* [Linked Data Cryptographic Suite Registry](https://w3c-ccg.github.io/ld-cryptosuite-registry/)
* [Linked Data Proofs](https://w3c-dvcg.github.io/ld-proofs/)
* [Object Capabilities for Linked Data](https://w3c-ccg.github.io/ocap-ld/)

## Install

Requires Node.js 8.3+

To install locally (for development):

```
git clone https://github.com/digitalbazaar/did-io.git
cd did-io
npm install
```

To install as a dependency in another project, add this to your `package.json`:

```
"did-io": "^0.7.0"
```

## Usage

### Setting Up Storage

To work with DIDs, you'll need storage for keys, local DID docs, and
notes.

**By default, everything is stored in `~/.dids/<method>/<mode>/`, where `mode`
is `test`/`live` etc.**

DIDs are essentially repositories of public keys on various networks / ledgers.
Any non-trivial operations that involve them, such as registering, updating,
authenticating and so on, necessarily involve working with corresponding private
keys.

To aid with experimentation and development of DID-related prototypes, `did-io`
uses a simple filesystem based JSON blob storage system, to store private keys,
local copies of DID documents, and DID metadata on one's local machine.

Keys from DID Documents (as well as related metadata) you control will be stored
in the `~/.dids/<method>/<mode>/` folder by default, and will be organized by
DID.

For example for a DID of "did:method:abcd", the following files would be
potentially created:

- `~/.dids/method/test/did:method:abcd.json`
- `~/.dids/method/test/did:method:abcd.keys.json`
- `~/.dids/method/test/did:method:abcd.meta.json`

You can override the storage mechanism for each ledger method (to store JSON
files in a different directory, or to use an in-memory `MockStore` for unit
testing).

### Configuring method-specific drivers

`did-io` is meant to be a DID resolver harness for use with one or more 
method-specific drivers (no drivers are included by default). It uses a 
[Chai](https://www.chaijs.com/)-like plugin architecture, where each driver
is loaded via `didIo.use(method, driver)`. 

That means that you need to create instances of specific driver libraries for
each method that you want to use. 

#### Creating a `did-io` Client Instance

```js
const didIo = require('did-io');

// You can now specify which DID methods you want via `.use(method, driver)`  
```

#### Supported Drivers

* [Veres One]()
* [did:key]() method

#### Veres One DID Method

* [Veres One Method spec](https://w3c-ccg.github.io/didm-veres-one/)
* [`did-veres-one`](https://github.com/veres-one/did-veres-one) driver docs

```js
const v1 = require('did-veres-one');

// See did-veres-one repo for instructions on how to set up the httpsAgent etc
const veresOneDriver = v1.driver({ mode: 'dev', httpsAgent, documentLoader });

// to use the did:v1 / Veres One method
didIo.use('v1', veresOneDriver);

// Now you can start using the API
didIo.get({ did }).then(didDoc => { console.log(didDoc); }); 
```

Some operations are method-specific, and can be only called on individual
drivers:

```js
didIo.methods['v1'].generate({...});
```


##### Veres One Supported Operations

* `generate()`
* `register()`
* **`get()`**
* `getLocal()`
* **`update()`**

#### `did:key` DID Method

* [`did-key-driver`]() driver docs

```js
const keyDriver = require('did-key-driver');

// to use the did:key method
didIo.use('key', keyDriver);
```

##### `did-key` Supported Operations

* `generate()`
* **`get()`**

## Contribute

See [the contribute file](https://github.com/digitalbazaar/bedrock/blob/master/CONTRIBUTING.md)!

PRs accepted.

Small note: If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from
Digital Bazaar: support@digitalbazaar.com

## License

[New BSD License (3-clause)](LICENSE) © Digital Bazaar
