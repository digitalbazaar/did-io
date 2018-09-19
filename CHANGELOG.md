# did-io ChangeLog

## 0.8.0
(Migrating from v0.7.0 will require renaming the relevant properties in existing
DID Docs.)

## Changed

- **BREAKING**: Updated terminology to match latest VeresOne DID method specs:
  `grantCapability -> capabilityDelegation`,
  `invokeCapability -> capabilityInvocation`
- **BREAKING**: Renamed `secretKey` to `privateKey`, to match Digital
  Bazaar conventions.

## 0.7.0 - 2018-09-10

## Changed (BREAKING changes)
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
