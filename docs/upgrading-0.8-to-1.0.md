## Upgrading from version `v0.8.x` to `v1.0.0`

This version is a major breaking release, based on cumulative experience in
the field with DID method drivers.

Use the following checklist to upgrade your code.

#### 1. Change the import statements.

Before:

```js
import didIo from 'did-io'; // or 
const didIo = require('did-io');
```

Now:
```js
import {CachedResolver} from '@digitalbazaar/did-io'; // or

const {CachedResolver} = require('@digitalbazaar/did-io');

const resolver = new CachedResolver(); // See README#cache-management
```

#### 2. Change the `.use()` statements.

Before:

```js
didIo.use('key', didKeyDriver);
```
Now:

```js
resolver.use(didKeyDriver);
```

#### 3. Change the `.generate()` usage.

Before, each individual did method driver's `.generate()` returned a
`DidDocument` class instance, which also provided access to the generated
public/private key pairs via the `.keys` property.

```js
const didDocument = await didMethodDriver.generate();
didDocument.keys
// a javascript object with keyId -> keyPair mapping
```

Now, each driver's `.generate()` returns a tuple of `didDocument`, a `Map`
of public/private key pairs (by key id), and a convenience `methodFor` function
that allows lookup of key (verification method) by its intended purpose.

```js
const {didDocument, keyPairs, methodFor} = await didMethodDriver.generate();
didDocument
// -> plain JS object, representing a DID document.
keyPairs
// -> a javascript Map of public/private LDKeyPair instances (from crypto-ld),
//   by key id. See step #4 below, for usage.
```

#### 4. Use the new provided convenience methods 
   
You can use the new provided convenience methods (`methodFor()` with 
`.generate()`,  and `didMethodDriver.publicMethodFor()` with `.get()`) to get a 
hold of key pair instances (previously, this was done via a manual process of 
determining key id and using `didDocument.keys[keyId]`).

When generating:

```js
const {didDocument, methodFor} = await didMethodDriver.generate();

methodFor({purpose: 'keyAgreement'});
// for example, an X25519KeyAgreementKey2020 key pair instance, that can
// be used for encryption/decryption using `@digitalbazaar/minimal-cipher`.
methodFor({purpose: 'assertionMethod'});
// for example, an Ed25519VerificationKey2020 key pair instance for
// signing and verifying Verifiable Claims (VCs).
```

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

#### 5. Check version compatibility

Check the [Version compatibility](https://github.com/digitalbazaar/did-io#version-compatibility)
table, since it's very likely that you're not only upgrading `did-io`, but _also_
upgrading the did drivers, crypto suites, signature suites, and so on.

