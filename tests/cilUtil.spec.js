'use strict';

const {describe, it} = require('mocha');
const chai = require('chai');
const sinon = require('sinon');
const CilUtils = require('../cilUtils');
const chaiProm = require('chai-as-promised');

chai.use(chaiProm);
const {assert} = chai;

const sleep = (delay) => {
    return new Promise(resolve => {
        setTimeout(() => resolve(), delay);
    });
};

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
            rpcAddress: 'localhost'
        });
    });

    it('should create class', async () => {
        assert.isOk(utils);
    });

    it('should getUtxos', async () => {
        utils._client.request = sinon.fake.resolves({
            "result": [
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
        });

        const result = await utils.getUtxos('test');
        assert.isOk(Array.isArray(result));
        assert.equal(result.length, 2);
    });

    describe('createTxWithFunds', async () => {
        it('should be two input and change', async () => {
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
    });

    it('should createTxInvokeContract', async () => {
        utils._client.request = sinon.fake.resolves({
            "result": [
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
        });

        const tx = await utils.createTxInvokeContract(
            'Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86',
            {
                method: 'method',
                arrArguments: []
            }
        );
        assert.isOk(tx);
        assert.equal(tx.inputs.length, 1);
        assert.equal(tx.outputs.length, 1);
    });

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

    it('should get "result" from RPC response for getUtxos ', async () => {
        const result = 'some data';
        utils._client.request = sinon.fake.resolves({result});
        const res = await utils.getUtxos();
        assert.equal(res, result);
    });

    it('should FAIL to get getUtxos', async () => {
        utils._client.request = sinon.fake.resolves({error: 'some error'});
        return assert.isRejected(utils.getUtxos());
    });
})
;
