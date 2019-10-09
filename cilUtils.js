const url = require('url');
const assert = require('assert');
const rpc = require('jayson/promise');
const rp = require('request-promise');
const factory = require('chain-in-law');
const Long = require('long');

// на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
const NUM_OF_OUTPUTS = 20;

class CilUtils {
    constructor(options) {
        const {rpcAddress, rpcPort, rpcUser, rpcPass, nFeeDeploy, nFeeInvoke, nFeePerInputOutput, privateKey, apiUrl} = options;

        assert(privateKey, 'Specify privateKey');
        assert(rpcAddress, 'Specify rpcAddress');
        assert(rpcPort, 'Specify rpcPort');
        assert(apiUrl || rpcAddress, 'Specify apiUrl or rpcAddress (ENV)');

        this._client = rpc.client.http({host: rpcAddress, port: rpcPort, auth: `${rpcUser}:${rpcPass}`});
        this._kpFunds = factory.Crypto.keyPairFromPrivate(privateKey);

        this._loadedPromise = factory.asyncLoad()
            .then(_ => {
                this._nFeeDeploy = nFeeDeploy || factory.Constants.fees.CONTRACT_CREATION_FEE;
                this._nFeeInvoke = nFeeInvoke || factory.Constants.fees.CONTRACT_INVOCATION_FEE;
                this._nFeePerInputOutput = nFeePerInputOutput || factory.Constants.fees.TX_FEE * 0.12;
            })
            .catch(err => {
                console.error(err);
                process.exit(1);
            });

        this._apiUrl = apiUrl;
    }

    asyncLoaded() {
        return this._loadedPromise;
    }

    async createTxWithFunds({
                                arrCoins,
                                gatheredAmount,
                                receiverAddr: strAddress,
                                amount: nAmountToSend,
                                nOutputs: numOfOutputs = NUM_OF_OUTPUTS,
                                arrReceivers,
                                manualFee,
                                nConciliumId
                            }) {
        await this._loadedPromise;

        if (!arrReceivers) {
            arrReceivers = [[strAddress, nAmountToSend]];
        }

        let nTotalSent = 0;
        const tx = new factory.Transaction();
        await this._addInputs(tx, arrCoins);

        for (let [strAddr, nAmount] of arrReceivers) {
            nTotalSent += nAmount;
            strAddr = this.stripAddressPrefix(strAddr);

            // разобьем сумму на numOfOutputs выходов, чтобы не блокировало переводы
            for (let i = 0; i < numOfOutputs; i++) {
                tx.addReceiver(parseInt(nAmount / numOfOutputs), Buffer.from(strAddr, 'hex'));
            }
        }

        // ConciliumId
        if (nConciliumId) tx.conciliumId = nConciliumId;

        // сдача есть?
        let fee = this.calculateTxFee(tx, false);
        let change = gatheredAmount - nTotalSent - (manualFee ? manualFee : fee);
        if (change > 0) {
            fee = this.calculateTxFee(tx);
            change = gatheredAmount - nTotalSent - (manualFee ? manualFee : fee);

            if (change > 0) tx.addReceiver(change, Buffer.from(this._kpFunds.address, 'hex'));
        }

        for (let i in tx.inputs) {
            tx.claim(parseInt(i), this._kpFunds.privateKey);
        }
        return tx;
    }

    async sendTx(tx) {
        await this.queryRpcMethod('sendRawTx', {"strTx": tx.encode().toString('hex')});
    }

    /**
     * Query RPC for UTXOs for address
     *
     * @param {String} strAddress
     * @return {Promise<[{hash,nOut, amount}]>}
     */
    async getUtxos(strAddress) {
        strAddress = strAddress || this._kpFunds.address;

        if (this._apiUrl) return await this._queryApi('Unspent', strAddress);
        return this.queryRpcMethod('walletListUnspent', {strAddress, bStableOnly: true});
    }

    /**
     *
     * @param {Array} arrUtxos of {hash, nOut, amount}
     * @param {Number} amount TO SEND (not including fees)
     * @param {Boolean} bUseOnlyOne - use one big output for payment (it will be last one!)
     * @return {arrCoins, gathered}
     */
    gatherInputsForAmount(arrUtxos, amount, bUseOnlyOne = false) {
        const arrCoins = [];
        let gathered = 0;
        for (let coins of arrUtxos) {
            if (!coins.amount) continue;
            gathered += coins.amount;
            arrCoins.push(coins);
            if (bUseOnlyOne) {
                if (coins.amount > amount) return {arrCoins: [coins], gathered: coins.amount, skip: arrCoins.length};
            } else if (gathered > amount + this._nFeePerInputOutput * arrCoins.length) return {arrCoins, gathered};
        }
        throw new Error('Not enough coins!');
    }

    gatherInputsForContractCall(arrUtxos, nFee) {
        return this.gatherInputsForAmount(arrUtxos, nFee || this._nFeeInvoke);
    }

    stripAddressPrefix(strAddr) {
        const prefix = factory.Constants.ADDRESS_PREFIX;
        return strAddr.substring(0, 2) === prefix ?
            strAddr.substring(prefix.length)
            : strAddr;
    }

    async createTxInvokeContract(strAddress, objInvokeCode, arrInputs, fee) {
        await this._loadedPromise;

        strAddress = this.stripAddressPrefix(strAddress);

        const tx = factory.Transaction.invokeContract(
            strAddress,
            objInvokeCode,
            0,
            Buffer.from(this._kpFunds.address, 'hex')
        );

        fee = fee || this._nFeeInvoke * 10;
        await this._fillInputsFromRpc(tx, fee);
        for (let i in tx.inputs) {
            tx.claim(parseInt(i), this._kpFunds.privateKey);
        }

        return tx;
    }

    async queryRpcMethod(strName, objParams) {
        const res = await this._client.request(
            strName,
            objParams
        );
        if (res.error) throw res.error;
        if (res.result) return res.result;
    }

    static prepareForStringifyObject(obj) {
        return factory.utils.prepareForStringifyObject(obj);
    }

    async _queryApi(endpoint, strParam) {
        const options = {
            method: "GET",
            rejectUnauthorized: false,
            url: url.resolve(this._apiUrl, `${endpoint}/${strParam}`),
            json: true
        };

        const result = await rp(options);
        return result;
    }

    /**
     * Fill TX with inputs from utxos
     *
     * @param {Transaction} tx
     * @param {Array} arrCoins {hash, nOut}
     * @private
     */
    async _addInputs(tx, arrCoins) {
        for (let input of arrCoins) {
            tx.addInput(input.hash, input.nOut);
        }
    }

    /**
     * Fill TX with inputs for requested amount, or throws
     *
     * @param {Transaction} tx
     * @param {Number} amount
     * @private
     */
    async _fillInputsFromRpc(tx, amount) {
        const arrUtxos = await this.getUtxos();
        const {arrCoins, gathered} = this.gatherInputsForAmount(arrUtxos, amount);
        this._addInputs(tx, arrCoins);
    }

    calculateTxFee(tx, bWithChange = true) {
        const nOutputsCount = tx.outputs ? tx.outputs.length : 0;
        const nInputsCount = tx.inputs ? tx.inputs.length : 0;
        assert(nInputsCount > 0, 'No inputs in tx!');
        return this._nFeePerInputOutput * (nOutputsCount + nInputsCount + (bWithChange ? 1 : 0));
    }
}

module.exports = CilUtils;
