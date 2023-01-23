const url = require('url');
const assert = require('assert');
const rpc = require('jayson/promise');
const rp = require('request-promise');
const factory = require('chain-in-law');

const sleep = (delay) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), delay);
  });
};

// на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
const NUM_OF_OUTPUTS = 20;

class CilUtils {
  constructor(options) {
    const {
      rpcAddress,
      rpcPort,
      rpcUser,
      rpcPass,
      nFeeDeploy,
      nFeeInvoke,
      nFeePerInputOutput,
      privateKey,
      apiUrl
    } = options;

    assert(privateKey, 'Specify privateKey');
    assert(apiUrl || rpcAddress, 'Specify apiUrl or rpcAddress (ENV)');
    assert(rpcPort, 'Specify rpcPort');

    const fClient = rpcPort === 443 ? rpc.client.https : rpc.client.http;
    this._client = fClient({host: rpcAddress, port: rpcPort, auth: `${rpcUser}:${rpcPass}`});
    this._kpFunds = factory.Crypto.keyPairFromPrivate(privateKey);

    this._loadedPromise = factory.asyncLoad()
        .then(_ => {
          this._nFeeDeploy = nFeeDeploy || factory.Constants.fees.CONTRACT_CREATION_FEE;
          this._nFeeInvoke = nFeeInvoke || factory.Constants.fees.CONTRACT_INVOCATION_FEE;
          this._nFeePerInputOutput = nFeePerInputOutput || factory.Constants.fees.TX_FEE * 0.12;
          this._nFeePerInputNoSign = factory.Constants.fees.TX_FEE * 0.04;
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
    let fee = this.calculateTxFee(tx, false, true);
    let change = gatheredAmount - nTotalSent - (manualFee ? manualFee : fee);
    if (change > 0) {
      fee = this.calculateTxFee(tx);
      change = gatheredAmount - nTotalSent - (manualFee ? manualFee : fee);

      if (change > 0) tx.addReceiver(change, Buffer.from(this._kpFunds.address, 'hex'));
    }

    // for single PK scenario it's allowed to use single claimProof in txSignature
    if (tx.inputs.length > 1) {
      tx.signForContract(this._kpFunds.privateKey);
    } else {
      for (let i in tx.inputs) {
        tx.claim(parseInt(i), this._kpFunds.privateKey);
      }
    }

    return tx;
  }

  /**
   *
   * @param {Array} arrUtxos of {hash, nOut, amount}
   * @param {Number} amount TO SEND (not including fees)
   * @param {Boolean} bUseOnlyOne - use one big output for payment (it will be last one!)
   * @param {Boolean} bBigFirst - use big outputs for first payment
   * @return {arrCoins, gathered}
   */
  gatherInputsForAmount(arrUtxos, amount, bUseOnlyOne = false, bBigFirst = false) {
    const arrCoins = [];
    let gathered = 0;
    if (bBigFirst) {
      arrUtxos = arrUtxos.sort((a, b) => b.amount - a.amount);
    }

    for (let coins of arrUtxos) {
      if (!coins.amount) continue;
      gathered += coins.amount;
      arrCoins.push(coins);
      if (bUseOnlyOne) {
        if (coins.amount > amount) return {arrCoins: [coins], gathered: coins.amount, skip: arrCoins.length};
      } else if (gathered > amount + this._nFeePerInputOutput * (arrCoins.length + 1)) {
        return {
          arrCoins,
          gathered
        };
      }
    }
    throw new Error('Not enough coins!');
  }

  gatherInputsForContractCall(arrUtxos, nFee, bUseOnlyOne = false, bBigFirst = false) {
    return this.gatherInputsForAmount(arrUtxos, nFee || this._nFeeInvoke, bUseOnlyOne, bBigFirst);
  }

  async sendTx(tx) {
    await this.queryRpcMethod('sendRawTx', {"strTx": tx.encode().toString('hex')});
  }

  /**
   *
   * @param strTxHash
   * @param bContractCall
   * @returns {Promise<boolean>}
   */
  async isTxDone(strTxHash, bContractCall) {
    try {
      const strMethod = bContractCall ? 'getTxReceipt' : 'getTx';
      const statusToCheck = bContractCall ? 1 : 'confirmed';
      const {result} = await this._client.request(strMethod, {strTxHash});

      return result && result.status === statusToCheck;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   *
   * @param strTxHash
   * @param bContractCall - если это вызов контракта, то в эксплорере будет internalTx
   * @returns {Promise<boolean>}
   */
  async isTxDoneExplorer(strTxHash, bContractCall) {
    const hasInternalTx = (objResult) => !!(objResult.tx.payload.outs.length &&
                                            objResult.tx.payload.outs[0].intTx.length);

    try {
      const objResult = await this.queryApi('Transaction', strTxHash);
      const bHasTx = !!(objResult.status === 'stable' && objResult.block);
      return bHasTx && (bContractCall ? hasInternalTx(objResult) : await this._explorerHasUtxo(strTxHash));
    } catch (e) {
      return false;
    }
  }

  async waitTxDone(strTxHash, nHoldoffSeconds = 10 * 60, bContractCall = false) {
    await this._waitCommon(strTxHash, nHoldoffSeconds, bContractCall, false);
  }

  async waitTxDoneExplorer(strTxHash, nHoldoffSeconds = 10 * 60, bContractCall = false) {
    await this._waitCommon(strTxHash, nHoldoffSeconds, bContractCall, true);
  }

  async _waitCommon(strTxHash, nHoldoffSeconds = 10 * 60, bContractCall, bUseApi) {
    const nSecondsBetweenAttempts = 60;
    const nAttempts = parseInt(nHoldoffSeconds / nSecondsBetweenAttempts) + 1;

    for (let i = 0; i < nAttempts; i++) {
      if (bUseApi) {
        if (await this.isTxDoneExplorer(strTxHash, bContractCall)) return true;
      } else {
        if (await this.isTxDone(strTxHash, bContractCall)) return true;
      }

//      console.log(`Still not confirmed. Attempt "${i + 1}". Sleeping`);
      await this._sleep(nSecondsBetweenAttempts * 1000);
    }
    throw new Error('Transaction still is not confirmed');
  }

  /**
   * Query RPC for UTXOs for address
   *
   * @param {String} strAddress
   * @return {Promise<[{hash,nOut, amount}]>}
   */
  async getUtxos(strAddress) {
    strAddress = strAddress || this._kpFunds.address;

    if (this._apiUrl) return await this.queryApi('Unspent', strAddress);
    return this.queryRpcMethod('walletListUnspent', {strAddress, bStableOnly: true});
  }

  stripAddressPrefix(strAddr) {
    const prefix = factory.Constants.ADDRESS_PREFIX;
    return strAddr.substring(0, 2) === prefix ?
        strAddr.substring(prefix.length)
        : strAddr;
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

  async queryApi(endpoint, strParam) {
    const options = {
      method: "GET",
      rejectUnauthorized: false,
      url: url.resolve(this._apiUrl, `${endpoint}/${strParam}`),
      json: true
    };

    const result = await rp(options);
    return typeof result === 'string' ? JSON.parse(result) : result;
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

  calculateTxFee(tx, bWithChange = true, bOneSignature = true) {
    const nOutputsCount = tx.outputs ? tx.outputs.length : 0;
    const nInputsCount = tx.inputs ? tx.inputs.length : 0;
    assert(nInputsCount > 0, 'No inputs in tx!');
    return bOneSignature ?
        this._nFeePerInputNoSign * (nInputsCount) + this._nFeePerInputOutput * (nOutputsCount + (bWithChange ? 1 : 0)) :
        this._nFeePerInputOutput * (nOutputsCount + nInputsCount + (bWithChange ? 1 : 0));
  }

  /**
   *
   * @param {Number} nInputsCount
   * @param {Number} nOutputsCount
   * @param {Boolean} bOneSignature - будет подписано 1 приватником?
   * @returns {number}
   */
  estimateTxFee(nInputsCount, nOutputsCount, bOneSignature) {
    assert(nInputsCount > 0, 'No inputs in tx!');
    assert(nOutputsCount > 0, 'No outputs in tx!');
    return bOneSignature ?
        this._nFeePerInputNoSign * nInputsCount + this._nFeePerInputOutput * nOutputsCount :
        this._nFeePerInputOutput * (nOutputsCount + nInputsCount);

  }

  _sleep(nMsec) {
    return sleep(nMsec);
  }

  async _explorerHasUtxo(strTxHash) {
    try {
      const objResult = await this.queryApi('UTXO', strTxHash);
      return !!Object.keys(objResult).length;
    } catch (e) {
      return false;
    }
  }
}

module.exports = CilUtils;
