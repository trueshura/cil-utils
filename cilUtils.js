const assert = require('assert');
const rpc = require('jayson/promise');
const factory = require('chain-in-law');

// на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
const NUM_OF_OUTPUTS = 20;

class CilUtils {
    constructor(options) {
        const {rpcAddress, rpcPort, nFeeDeploy, nFeeInvoke, nFeePerInputOutput, privateKey} = options;

        assert(privateKey, 'Specify privateKey');
        assert(rpcAddress, 'Specify rpcAddress');
        assert(rpcPort, 'Specify rpcPort');

        this._client = rpc.client.http({host: rpcAddress, port: rpcPort});
        this._kpFunds = factory.Crypto.keyPairFromPrivate(privateKey);

        this._loadedPromise = factory.asyncLoad()
            .then(_ => {
                this._nFeeDeploy = nFeeDeploy || factory.Constants.fees.CONTRACT_CREATION_FEE;
                this._nFeeInvoke = nFeeInvoke || factory.Constants.fees.CONTRACT_INVOCATION_FEE;
                this._nFeePerInputOutput = nFeePerInputOutput || factory.Constants.fees.TX_FEE * 0, 12;
            })
            .catch(err => {
                console.error(err);
                process.exit(1);
            });
    }

    // TODO: Исправить на массив адресов, чтобы можно было нескольким отправлять
    async faucet(strAddress, amount, numOfOutputs = NUM_OF_OUTPUTS) {

        // Адрес куда слать (можно сгенерить с помощью generateWallet.js)
        const tx = await this.createTxWithFunds(strAddress, amount, numOfOutputs);
        await this.sendTx(tx);
    }

    async createTxWithFunds(strAddress, nAmountToSend, numOfOutputs, manualFee) {
        await this._loadedPromise;
        strAddress = this.stripAddressPrefix(strAddress);

        // we'll create numOfOutputs + 1
        let fee = this._nFeePerInputOutput * (numOfOutputs + 1);

        const tx = new factory.Transaction();
        const gathered = await this._addInputs(tx, nAmountToSend + (manualFee ? manualFee : fee));

        // разобьем сумму на numOfOutputs выходов, чтобы не блокировало переводы
        for (let i = 0; i < numOfOutputs; i++) {
            tx.addReceiver(parseInt(nAmountToSend / numOfOutputs), Buffer.from(strAddress, 'hex'));
        }

        fee += this._nFeePerInputOutput * tx.inputs.length;

        // сдача
        const change = gathered - nAmountToSend - (manualFee ? manualFee : fee);
        if (change) {
            tx.addReceiver(change, Buffer.from(this._kpFunds.address, 'hex'));
        }

        for (let i in tx.inputs) {
            tx.claim(parseInt(i), this._kpFunds.privateKey);
        }
        return tx;
    }

    async sendTx(tx) {
        await this.queryRpcMethod('sendRawTx', {"strTx": tx.encode().toString('hex')});
        console.log(`Funded in ${tx.getHash()}`);
    }

    async getUtxos(strAddress) {
        strAddress = strAddress || this._kpFunds.address;

        return await this.queryRpcMethod(
            'walletListUnspent',
            {strAddress: strAddress, bStableOnly: true}
        );
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
            if (gathered > amount + this._nFeePerInputOutput * arrCoins.length) return {arrCoins, gathered};
        }
        throw new Error('Not enough coins!');
    }

    stripAddressPrefix(strAddr) {
        const prefix = factory.Constants.ADDRESS_PREFIX;
        return strAddr.substring(0, 2) === prefix ?
            strAddr.substring(prefix.length)
            : strAddr;
    }

    async createTxInvokeContract(strAddress, objInvokeCode, fee) {
        await this._loadedPromise;

        strAddress = this.stripAddressPrefix(strAddress);

        const tx = factory.Transaction.invokeContract(
            strAddress,
            objInvokeCode,
            0,
            Buffer.from(this._kpFunds.address, 'hex')
        );

        fee = fee || this._nFeeInvoke * 10;
        await this._addInputs(tx, fee);
        for (let i in tx.inputs) {
            tx.claim(parseInt(i), this._kpFunds.privateKey);
        }

        return tx;
    }

    /**
     * Fill TX with inputs for requested amount, or throws
     * return amount gathered with these inputs. use it to calculate change
     *
     * @param {Transaction} tx
     * @param {Number} nAmountNeeded
     * @return {Promise<Number>}
     * @private
     */
    async _addInputs(tx, nAmountNeeded) {
        const arrUtxos = await this.getUtxos();
        const {arrCoins, gathered} = this._gatherInputsForAmount(arrUtxos, nAmountNeeded);

        for (let input of arrCoins) {
            tx.addInput(input.hash, input.nOut);
        }

        return gathered;
    }

    async queryRpcMethod(strName, objParams) {
        const res = await this._client.request(
            strName,
            objParams
        );
        if (res.error) throw res.error;
        if (res.result) return res.result;
    }
}

module.exports = CilUtils;
