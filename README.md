# DID Client _(did-io)_

[![Build Status](https://travis-ci.org/digitalbazaar/did-io.png?branch=master)](https://travis-ci.org/digitalbazaar/did-io)

> A [DID](https://w3c-ccg.github.io/did-spec/) (Decentralized Identifier) resolution library for Javascript

## Table of Contents

- [Security](#security)
- [Background](#background)
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

Requires Node.js 8.10+.

```
npm install did-io
```

## Usage

### Requiring did-io (Node.js / npm)

```js
const dids = require('did-io');
```

### Setting Up Storage

TL;DR - to work with DIDs, you'll need storage for keys, local DID docs, and
notes.

**By default, everything is stored in `~/.dids/<method>/`**

DIDs are essentially repositories of public keys on various networks / ledgers.
Any non-trivial operations that involve them, such as registering, updating,
authenticating and so on, necessarily involve working with corresponding private
keys.

To aid with experimentation and development of DID-related prototypes, `did-io`
uses a simple filesystem based JSON blob storage system, to store private keys,
local copies of DID documents, and DID metadata on one's local machine.

Keys from DID Documents (as well as related metadata) you control will be stored
in the `~/.dids/<method>/` folder by default, and will be organized by DID.

For example for a DID of "did:method:abcd", the following files would be
potentially created:

- `~/.dids/method/did:method:abcd.json`
- `~/.dids/method/did:method:abcd.keys.json`
- `~/.dids/method/did:method:abcd.meta.json`

You can override the storage mechanism for each ledger method (to store JSON
files in a different directory, or to use an in-memory `MockStore` for unit
testing).

### Veres One Ledger Usage

See the [Veres One Method spec](https://w3c-ccg.github.io/didm-veres-one/) for
context.

```js
const v1 = dids.methods.veres();
```

#### Retrieving a Veres One DID Document

```js
const did = 'did:v1:test:nym:QdF43dq9Qu5HrDcMq91hebewWK5bvVWQ4CeyRrQ5Ydq';
const didDoc = await v1.get(did);
```

This also loads corresponding keys from the local `v1.keyStore`.

#### Generating a Veres One DID Document

```js
const didDocument = await v1.generate({ passphrase: null });
```

Note: This also saves the generated private/public key pairs, a local copy of
the document, as well as any metadata, in the local (typically on-disk) store.
See [Setting Up Storage](#setting-up-storage) for more detail.


#### Registering a (newly generated) DID Document

To register a DID Document using an Equihash proof of work:

```js
const result = await v1.register({ didDocument });
```

To register using an Accelerator:

```js
const accelerator = 'genesis.testnet.veres.one';
const authDoc = didDocumentFromAccelerator; // obtained previously

const result = await v1.register({ didDocument, accelerator, authDoc });

console.log(JSON.stringify(await result.text(), 0, 2));
```

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
