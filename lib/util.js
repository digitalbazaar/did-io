/**
 * Encodes input according to the "Base64url Encoding" format as specified
 * in JSON Web Signature (JWS) RFC7517. A URL safe character set is used and
 * trailing '=', line breaks, whitespace, and other characters are omitted.
 *
 * @param input the data to encode.
 * @param options
 *          forge: forge library.
 *
 * @return the encoded value.
 */
function encodeBase64Url(input, {forge}) {
  const enc = forge.util.encode64(input);
  return enc
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

/**
 * Decodes input according to the "Base64url Encoding" format as specified
 * in JSON Web Signature (JWS) RFC7517. A URL safe character set is used and
 * trailing '=', line breaks, whitespace, and other characters are omitted.
 *
 * @param input the data to decode.
 * @param options
 *          forge: forge library.
 *
 * @return the decoded value.
 */
function decodeBase64Url(input, {forge}) {
  let normalInput = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const mod4 = normalInput.length % 4;
  if(mod4 === 0) {
    // pass
  } else if(mod4 === 2) {
    normalInput = normalInput + '==';
  } else if(mod4 === 3) {
    normalInput = normalInput + '=';
  } else {
    throw new Error('Illegal base64 string.');
  }
  return forge.util.decode64(normalInput);
}

function deepClone(input) {
  return JSON.parse(JSON.stringify(input));
}

module.exports = {
  decodeBase64Url,
  encodeBase64Url,
  deepClone
};
