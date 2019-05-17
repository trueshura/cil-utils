const assert = require('assert');
const rpc = require('jayson/promise');
const factory = require('chain-in-law');

// на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
const numOfOutputs = 20;

class CilUtils {
    constructor(options) {
        const {rpcAddress, rpcPort, nFeeDeploy, nFeePerInputOutput, privateKey} = options;

        assert(privateKey, 'Specify privateKey');
        assert(rpcAddress, 'Specify rpcAddress');
        assert(rpcPort, 'Specify rpcPort');
        assert(this._nFeeDeploy = nFeeDeploy, 'Specify nFeeDeploy');
        assert(this._nFeePerInputOutput = nFeePerInputOutput, 'Specify nFeePerInputOutput');

        this._client = rpc.client.http({host: rpcAddress, port: rpcPort});
        this._kpFunds = factory.Crypto.keyPairFromPrivate(privateKey);

        this._loadedPromise = factory.asyncLoad().catch(err => {
            console.error(err);
            process.exit(1);
        });
    }

    async faucet(strAddress, amount, numOfOutputs = numOfOutputs) {

        // Адрес куда слать (можно сгенерить с помощью generateWallet.js)
        const tx = await this.createTxWithFunds(strAddress, amount, numOfOutputs);
        await this.sendTx(tx);
    }

    async createTxWithFunds(strAddress, nAmountToSend, numOfOutputs) {
        await this._loadedPromise;
        strAddress = this.stripAddressPrefix(strAddress);

        const arrUtxos = await this.getUtxos(this._kpFunds.address);
        const {arrCoins, gathered} = this._gatherInputsForAmount(arrUtxos, nAmountToSend);

        const tx = new factory.Transaction();
        for (let input of arrCoins) {
            tx.addInput(input.hash, input.nOut);
        }

        // разобьем сумму на numOfOutputs выходов, чтобы не блокировало переводы
        for (let i = 0; i < numOfOutputs; i++) {
            tx.addReceiver(parseInt(nAmountToSend / numOfOutputs), Buffer.from(strAddress, 'hex'));
        }

        const fee = this._nFeePerInputOutput * (arrCoins.length + numOfOutputs);

        // сдача
        const change = gathered - nAmountToSend - fee;
        if (change) {
            tx.addReceiver(change, Buffer.from(this._kpFunds.address, 'hex'));
        }

        for (let i in arrCoins) {
            tx.claim(parseInt(i), this._kpFunds.privateKey);
        }
        return tx;
    }

    async sendTx(tx) {
        const result = await this._client.request('sendRawTx', {"strTx": tx.encode().toString('hex')});
        if (result.error) {
            throw new Error(result.error.message);
        }
        console.log(`Funded in ${tx.getHash()}`);
    }

    async getUtxos(strAddress) {
        const {result} = await this._client.request(
            'walletListUnspent',
            {strAddress: strAddress, bStableOnly: true}
        );
        return result;
    }

    /**
     *
     * @param {Array} arrUtxos of {hash, nOut, amount}
     * @param {Number} amount
     * @return {arrCoins, gathered}
     */
    _gatherInputsForAmount(arrUtxos, amount) {
        const arrCoins = [];
        let gathered = 0;
        for (let coins of arrUtxos) {
            if (!coins.amount) continue;
            gathered += coins.amount;
            arrCoins.push(coins);
            if (gathered >= amount) return {arrCoins, gathered};
        }
        throw new Error('Not enough coins!');
    }

    stripAddressPrefix(strAddr) {
        const prefix = factory.Constants.ADDRESS_PREFIX;
        return strAddr.substring(0, 2) === prefix ?
            strAddr.substring(prefix.length)
            : strAddr;
    }
}

module.exports = CilUtils;
