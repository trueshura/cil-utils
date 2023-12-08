let factory;

//if(window) {
const crypto = require('crypto-web');
const transaction = require('./misc/transaction');

factory = {
    asyncLoad: async () => {},
    Crypto: crypto,
    Transaction: transaction,
    Constants: {
        fees: {

            // money send fee per Kbyte
            TX_FEE: 4000,

            // contract creation
            CONTRACT_CREATION_FEE: 1e4,

            // contract invocation
            CONTRACT_INVOCATION_FEE: 1e4,

            // contract send moneys
            INTERNAL_TX_FEE: 300,

            STORAGE_PER_BYTE_FEE: 10
        },
        ADDRESS_PREFIX: 'Ux'
    }
};
//}else{
//    factory = require('chain-in-law');
//}

module.exports = factory;
