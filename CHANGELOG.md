# did-io ChangeLog

## 2.0.0 - 2022-xx-xx

### Changed
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Require Node.js >=14.
- Update dependencies.
- Lint module.

## 1.1.0 - 2021-11-30

### Added
- Add `resolver.generate()` pass-through function.

## 1.0.0 - 2021-04-06

This version is a major breaking release, based on cumulative experience in
the field with DID method drivers. See Upgrading from `8.x` section for
instructions.

### Changed
- **BREAKING**: Rename NPM package name from `did-io` to `@digitalbazaar/did-io`.
- **BREAKING**: `.use()` no longer requires a method id first param. New usage:
  `.use(driver)`.
- Add a `CachedResolver` class (extracted from `did:key` method driver) to
  server as the driver harness.
- **BREAKING**: Change module export signature. (see Upgrading section below
  on usage.)
- **BREAKING**: No longer export a `DidDocument` class. DID documents are now
  expected to be plain JS/parsed JSON objects, instead of `DidDocument`
  instances.

### Upgrading from `8.x`

See [Upgrading v0.8 to v1.0.0 checklist](docs/upgrading-0.8-to-1.0.md) in `docs/`.

## 0.8.3 - 2020-08-19

### Fixed
- Engine specification format in package.json (Node 12+).

## 0.8.2 - 2020-05-12

### Added
- Remove `forceConstruct` flag (move it down to individual drivers).

## 0.8.1 - 2020-05-01

### Added
- Add a `forceConstruct` optimization flag.

## 0.8.0 - 2020-04-10

### Changed

- **BREAKING**: Update API to Chai-like `dids.use(method, driver)` architecture
  (no methods will be bundled with did-io by default).
- **BREAKING**: Updated terminology to match latest VeresOne DID method specs:
  `grantCapability -> capabilityDelegation`,
  `invokeCapability -> capabilityInvocation`
- **BREAKING**: Renamed `secretKey` to `privateKey`, to match Digital
  Bazaar conventions. (Migrating from v0.7.0 will require renaming the relevant properties in existing DID Docs.)

## 0.7.0 - 2018-09-10

### Changed (BREAKING changes)
- Node requirement bumped to 8.3
- Updated license to match newer projects
- Library updated to run against Veres One testnet
- Port DID creation and management code from `did-client`
- Port web ledger client and key management code from `did-veres-one` and
  `did-veres-one-client`
- Changed DID storage method - private keys, metadata and DID Docs stored
  separately, on disk

## 0.6.7 - 2017-07-11

### Added
- Add support for new DID format as described in the [DID specification].

## 0.6.6 - 2016-08-01

- See git history for changes previous to this release.

[DID specification]: https://opencreds.github.io/did-spec/#the-generic-did-scheme
