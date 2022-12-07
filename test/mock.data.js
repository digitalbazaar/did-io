// these come from the did test suite and are here to ensure
// the RegExp ported over for dids and did urls behave as expected
export const validDidUrls = [
  'did:example:123',
  'did:example:123456789abcdefghi',
  'did:example:123#ZC2jXTO6t4R501bfCXv3RxarZyUbdP2w_psLwMuY6ec',
  'did:example:123#keys-1',
  'did:example:123456/path',
  'did:example:123456/path/multiple/path',
  'did:example:123456/1path/2multiple/3path',
  'did:example:123456/1-path/2-multiple/3-path',
  'did:example:123456/path%20with%20space',
  'did:example:123456?versionId=1',
  'did:example:123#public-key-0',
  'did:example:123#sig_064bebcc',
  'did:example:123?service=agent&relativeRef=/credentials#degree',
  'did:example:abc:def-hij#klm',
  'did:orb:bafkreiazah4qrybzyapmrmk2dhldz24vfmavethcrgcoq7qhic63zz55ru:EiAag4' +
  'cmgxAE2isL5HG3mxjS7WRq4l-xyyTgULCAcEHQQQ#nMef0L2qNWVe8yt97ap0vH7kQK2oFdm4z' +
  'kQkYL7ymOo'
];

export const typeErrors = [
  false,
  0,
  undefined,
  null,
  NaN
];

export const invalidDidSyntax = [
  'STRING',
  'did:',
  'did:example'
];

export const invalidDidUrlSyntax = [
  'did:example:id/validPath/ invalid path /',
  'did:example:id/validPath/^invalid^path^/'
];

export const invalidDidUrls = [
  ...typeErrors,
  ...invalidDidSyntax,
  ...invalidDidUrlSyntax
];

export const validDids = [
  'did:example:123',
  'did:example:123456789abcdefghi',
  'did:example:123456789-abcdefghi',
  'did:example:123456789_abcdefghi',
  'did:example:123456789%20abcdefghi',
  'did:example:123abc:123456789abcdefghi',
  'did:example:abc%00',
  'did:example::::::abc:::123'
];

export const invalidDids = [
  ...invalidDidUrls,
  'did:example:123#ZC2jXTO6t4R501bfCXv3RxarZyUbdP2w_psLwMuY6ec',
  'did:example:123#keys-1',
  'did:example:abc:::'
];
