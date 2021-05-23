'use strict';

const {describe, it} = require('mocha');
const chai = require('chai');
const sinon = require('sinon');
const CilUtils = require('../cilUtils');
const chaiProm = require('chai-as-promised');

chai.use(chaiProm);
const {assert} = chai;

let utils;

describe('CilUtils', () => {
  before(async function() {
    this.timeout(15000);
  });

  after(async function() {
    this.timeout(15000);
  });

  beforeEach(async function() {
    this.timeout(15000);
    utils = new CilUtils({
      privateKey: '15716ac92ee51909286fb51cd2d600bbedbdf85b675e9bca60067689d7b0f27c',
      nFeePerInputOutput: 250,
      nFeeDeploy: 1e4,
      rpcPort: 18222,
      rpcAddress: 'localhost',
      apiUrl: 'dummy'
    });
  });

  it('should create class', async () => {
    assert.isOk(utils);
  });

  it('should getUtxos', async () => {
    utils._queryApi = sinon.fake.resolves([
      {
        "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
        "nOut": 1,
        "amount": 499986000,
        "isStable": true
      },
      {
        "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
        "nOut": 1,
        "amount": 499986000,
        "isStable": true
      }]
    );

    const result = await utils.getUtxos('test');
    assert.isOk(Array.isArray(result));
    assert.equal(result.length, 2);
  });

  describe('gatherInputsForAmount', () => {
    let arrUtxos;
    const amount = 499986000;

    beforeEach(() => {
      arrUtxos = [
        {
          "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
          "nOut": 1,
          "amount": amount,
          "isStable": true
        },
        {
          "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
          "nOut": 1,
          "amount": amount,
          "isStable": true
        }];
    });
    it('should use one utxo (fee)', async () => {
      const {arrCoins, gathered} = utils.gatherInputsForAmount(arrUtxos, amount / 2);

      assert.equal(arrCoins.length, 1);
      assert.equal(gathered, amount);
    });

    it('should use both utxo (fee)', async () => {
      const {arrCoins, gathered} = utils.gatherInputsForAmount(arrUtxos, amount);

      assert.equal(arrCoins.length, 2);
      assert.equal(gathered, 2 * amount);
    });

    it('should throw (fee)', async () => {
      assert.throws(() => utils.gatherInputsForAmount(arrUtxos, 2 * amount), 'Not enough coins!');
    });
  });

  describe('isTxDone', async () => {
    let clock;
    beforeEach(async function() {
      this.timeout(15000);
      utils = new CilUtils({
        privateKey: '15716ac92ee51909286fb51cd2d600bbedbdf85b675e9bca60067689d7b0f27c',
        nFeePerInputOutput: 250,
        nFeeDeploy: 1e4,
        rpcPort: 18222,
        rpcAddress: 'localhost',
        apiUrl: 'dummy'
      });
    });

    afterEach(async () => {
    });

    it('should getDone', async () => {
      let nAttempt = 3;
      utils._client = {
        request: async () => {
          if (!--nAttempt) return {result: {status: 'confirmed'}};
          return {result: {}};
        }
      };
      utils._sleep = async () => {};

      await utils.isTxDone('fakeHash');
    });
  });

  it('should createTxWithFunds (two input and change)', async () => {
    const amount = 499986000;
    const nOutputs = 20;
    const arrCoins = [
      {
        "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      },
      {
        "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      }];

    const tx = await utils.createTxWithFunds({
      arrCoins,
      gatheredAmount: arrCoins.reduce((accum, current) => accum += current.amount, 0),
      receiverAddr: 'Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86',
      amount,
      nOutputs: 20,
      manualFee: 1
    });

    assert.isOk(tx);
    assert.equal(tx.inputs.length, 2);
    assert.equal(tx.outputs.length, nOutputs + 1);
  });

  it('should createTxWithFunds (two receivers and change)', async () => {
    const amount = 1e4;
    const nOutputs = 2;
    const manualFee = 100;
    const arrCoins = [
      {
        "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      },
      {
        "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      }];

    const tx = await utils.createTxWithFunds({
      arrCoins,
      gatheredAmount: arrCoins.reduce((accum, current) => accum + current.amount, 0),
      nOutputs,
      manualFee,
      arrReceivers: [
        ['Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86', amount / 2],
        ['Ux00c4cfe96bd4e2a3df3d5115b75557b9f05d4b00', amount]
      ]
    });

    assert.isOk(tx);
    assert.equal(tx.inputs.length, 2);
    assert.equal(tx.outputs.length, 2 * nOutputs + 1);

    // it exclude change
    assert.equal(tx.amountOut(), 2 * amount - manualFee);
  });

  it('should createTxWithFunds (two receivers NO change)', async () => {
    const amount = 1e4;
    const nOutputs = 2;
    const nManualFee = 1000;
    const arrCoins = [
      {
        "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      },
      {
        "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
        "nOut": 1,
        "amount": amount,
        "isStable": true
      }];

    const tx = await utils.createTxWithFunds({
      arrCoins,
      gatheredAmount: arrCoins.reduce((accum, current) => accum + current.amount, 0),
      nOutputs,
      manualFee: nManualFee,
      arrReceivers: [
        ['Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86', amount - nManualFee],
        ['Ux00c4cfe96bd4e2a3df3d5115b75557b9f05d4b00', amount]
      ]
    });

    assert.isOk(tx);
    assert.equal(tx.inputs.length, 2);
    assert.equal(tx.outputs.length, 2 * nOutputs);

    // it exclude change
    assert.equal(tx.amountOut(), 2 * amount - nManualFee);
  });

//  it('should createTxInvokeContract', async () => {
//    utils._queryApi = sinon.fake.resolves([
//      {
//        "hash": "13252b7f61784f4d45740c38b4bbf15629e066b198c70b54a05af6f006b5b6c2",
//        "nOut": 1,
//        "amount": 499986000,
//        "isStable": true
//      },
//      {
//        "hash": "21e8bdbee170964d36fcabe4e071bc14933551b9c2b031770ce73ba973bc4dd7",
//        "nOut": 1,
//        "amount": 499986000,
//        "isStable": true
//      }]
//    );
//
//    const tx = await utils.createTxInvokeContract(
//      'Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86',
//      {
//        method: 'method',
//        arrArguments: []
//      }
//    );
//    assert.isOk(tx);
//    assert.equal(tx.inputs.length, 1);
//    assert.equal(tx.outputs.length, 1);
//  });

  it('should successfully send tx', async () => {
    utils._client.request = sinon.fake.resolves({result: 'some data'});
    const fakeTx = {encode: () => 'fake', getHash: () => 'fakeHash'};
    await utils.sendTx(fakeTx);
  });

  it('should FAIL to send tx', async () => {
    utils._client.request = sinon.fake.resolves({error: 'some error'});
    const fakeTx = {encode: () => 'fake'};
    return assert.isRejected(utils.sendTx(fakeTx));
  });

  it('should get "result" from response for getUtxos', async () => {
    const result = 'some data';
    utils._queryApi = sinon.fake.resolves(result);
    const res = await utils.getUtxos();
    assert.equal(res, result);
  });

  it('should FAIL to get getUtxos', async () => {
    utils._client.request = sinon.fake.resolves({error: 'some error'});
    return assert.isRejected(utils.getUtxos());
  });
})
;
