# DID Client _(did-io)_

[![Build Status](https://travis-ci.org/digitalbazaar/did-io.png?branch=master)](https://travis-ci.org/digitalbazaar/did-io)
[![NPM Version](https://img.shields.io/npm/v/did-io.svg?style=flat-square)](https://npm.im/did-io)

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

Requires Node.js 10+

To install locally (for development):

```
git clone https://github.com/digitalbazaar/did-io.git
cd did-io
npm install
```

To install as a dependency in another project, add this to your `package.json`:

```
"did-io": "^0.9.0"
```

## Usage

### Configuring method-specific drivers

`did-io` is meant to be a DID resolver harness for use with one or more 
method-specific drivers (no drivers are included by default). It uses a 
[Chai](https://www.chaijs.com/)-like plugin architecture, where each driver
is loaded via `.use(driver)`. 

That means that you need to create instances of specific driver libraries for
each method that you want to use. 

#### Creating a `did-io` Client Instance

```js
import {DidResolver} from 'did-io';
const didIo = new DidResolver();

// You can now specify which DID methods you want via `.use(driver)`  
```

#### Supported Drivers

* [`did:v1`](https://github.com/veres-one/did-veres-one)
* [did:key](https://github.com/veres-one/did-method-key-js)

#### Veres One DID Method

* [Veres One Method spec](https://w3c-ccg.github.io/didm-veres-one/)
* [`did-veres-one`](https://github.com/veres-one/did-veres-one) driver docs

```js
const v1 = require('did-veres-one');

// See did-veres-one repo for instructions on how to set up the httpsAgent etc
const veresDriver = v1.driver({ mode: 'dev', httpsAgent, documentLoader });

// to use the did:v1 / Veres One method
didIo.use(veresDriver);

// Now you can start using the API (inside an async function)
const didDoc = await didIo.get({did});
console.log(didDoc);
```

```js
didIo.methods['v1'].generate({...});
// or
veresDriver.generate({...})
```

Some operations are method-specific, and can be only called on individual
drivers:

##### Veres One Supported Operations

* `register()`
* **`get()`**
* **`update()`**

#### `did:key` DID Method

* [`did-key-driver`]() driver docs

```js
const keyDriver = require('did-method-key');

// to use the did:key method
didIo.use(keyDriver);
```

##### `did-key` Supported Operations

* **`get()`**

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
