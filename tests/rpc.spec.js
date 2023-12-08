'use strict';

const {describe, it} = require('mocha');
const {assert} = require('chai');
const RPC = require('../misc/rpc-client');

const sleep = (delay) => {
    return new Promise(resolve => {
        setTimeout(() => resolve(), delay);
    });
};

describe('RPC (via axios)', () => {
    before(async function() {
        this.timeout(15000);
    });

    after(async function() {
        this.timeout(15000);
    });

    it('should create instance', async () => {
        const rpc = new RPC({url: 'https://ya.ru/', auth: 'login:pass'});
    });

    it.skip('should send request', async () => {
        const rpc = new RPC({url: 'https://rpc-dv-1.ubikiri.com/', auth: 'cilTest:d49c1d2735536baa4de1cc6'});

        const result = await rpc.request('getBlock', {
            "strBlockHash": "cfe8271e30208557c3abd30919c858b2853ced063920ade5c67bd7ad9e369383"
        });

        console.dir(result, {colors: true, depth: null});
    });

    it.skip('should send request 2', async () => {
        const rpc = new RPC({url: 'https://rpc-dv-1.ubikiri.com/', auth: 'cilTest:d49c1d2735536baa4de1cc6'});

        const result = await rpc.request('getTips', {});

        console.dir(result, {colors: true, depth: null});
    });

});
