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

To install locally (for development):

```
git clone https://github.com/digitalbazaar/did-io.git
cd did-io
npm install
```

To install as a dependency in another project, add this to your `package.json`:

```
"did-io": "digitalbazaar/did-io#v0.7.0"
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
const did = 'did:v1:test:nym:ApvL3PKAzQvFnRVqyZKhSYD2i8XcsLG1Dy4FrSdEKAdR';

v1.get({ did, mode: 'test' })
  .then(didDoc => { console.log(JSON.stringify(didDoc, 0, 2)); })
  .catch(console.error);
```

If available (meaning, if you were the one that registered this DID Doc on your
machine), this operation also loads corresponding private keys from the local
`v1.keyStore`.

#### Generating and Registering a Veres One DID Document

```js
// Generate a new DID Document, store the private keys locally
v1.generate({})
  .then(didDocument => {
    // A new didDocument is generated. Log it to console
    console.log('Generated:', JSON.stringify(didDocument, 0, 2));
    return didDocument;
  })

  // Now register the newly generated DID Document
  // Use Equihash Proof of Work by default (see below)
  .then(didDocument => v1.register({ didDocument }))

  // Log the results
  .then(registrationResult => {
    // Log the result of registering the didDoc to the VeresOne Test ledger
    console.log('Registered!', JSON.stringify(registrationResult, 0, 2));
  })
  .catch(console.error);
```

Note: This also saves the generated private/public key pairs, a local copy of
the document, as well as any metadata, in the local (typically on-disk) store.
See [Setting Up Storage](#setting-up-storage) for more detail.

#### Registering a (newly generated) DID Document

To register a DID Document using an Equihash proof of work:

```js
v1.register({ didDocument }); // async/Promise based operation
```

To register using an Accelerator:

```js
const accelerator = 'genesis.testnet.veres.one';
const authDoc = didDocumentFromAccelerator; // obtained previously

v1.register({ didDocument, accelerator, authDoc })
  .then(result => console.log(JSON.stringify(await result.text(), 0, 2)))
  .catch(console.error);
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
