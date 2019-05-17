const factory = require('chain-in-law');

const kpOwner = factory.Crypto.createKeyPair();
console.log(`Address: ${kpOwner.address}
PrivateKey: ${kpOwner.privateKey}
PublicKey: ${kpOwner.getPublic(false)}
`);
