'use strict';

var didDocument = {
  "@context":"https://w3id.org/identity/v1",
  "id":"did:32e89321-a5f1-48ff-8ec8-a4112be1215c",
  "idp":"did:bef5ac6a-ca9c-4548-8179-76b44692bb86",
  "accessControl":{
    "writePermission":[
      {
        "id":"did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
        "type":"CryptographicKey"
      },
      {
        "id":"did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
        "type":"Identity"
      }
    ]
  },
  "publicKey":[
    {
      "id":"did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
      "type":"CryptographicKey",
      "owner":"did:32e89321-a5f1-48ff-8ec8-a4112be1215c",
      "publicKeyPem":"-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgH4EXOXrM2hgFSPxaLYK\r\njkY2QoHlis5ntvvLi1/t5mloxerCZKTBRki7K+F9ForqREFn5SiSkzCJwNXYfbhj\r\n2BJjhSbOoPdbTanQKasaw22X8pcBeagHnPxG29xvhqDSddoIXjeAnVRU7ODkH4VX\r\n9rqKR+PaJKPCD7T5dx4zqiYgCrBLKRr/yFQUV+csbzmOm3AhJdKIwsPj5DxTP5WX\r\n/bYBJ4sDWbHWiAaDWRYo/SPSHO5RR7Vk/hvQpKn0H7SDX2DMf9RpVKtCNXmLM1pD\r\nA7reJU3VpVK1kG9oTTOPCX5PTVZb7WrFFBDSfGPznpYUeRSBixZUbv7CvC4wTxdh\r\nNwIDAQAB\r\n-----END PUBLIC KEY-----\r\n"
    }
  ],
  "signature":{
    "type":"GraphSignature2012",
    "created":"2015-07-02T21:45:26Z",
    "creator":"did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
    "signatureValue":"ba9dvZrSEn97zqnjEN0Mjp4nEMyJrEpfVwyThfXfCjTfmgZ7C325p7u5pTE2Zclw8X74UNOy8HqemQXSuIpdNZiU82o/ABZ6n1IKKxnAEVuMXzH1ukMH0ao32tldcwGtM9yonXJGPqtkzYtsCXdQxkM6C5Qf/MEaU83ZF0sUw6m+cQatWKsGDldu771A7+KxGApjbyMAza4c/oeDsNCuo7cbWZisglzQ0Dp0kGOXSCY3nxs28b1UkeLFf740Bs9j7AtayzYaVjwAdHLZeXK669tcuRDzc+BYLscu/6ry0H5EVOHjItMhjjQ4nho4ONr3dPA60c+3yfXZyIfs8UUI1Q=="
  }
};

module.exports = {
  didDocument: didDocument
};
