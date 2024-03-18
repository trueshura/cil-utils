'use strict';

const {describe, it} = require('mocha');
const {assert} = require('chai');
const RPC = require('../misc/rpc-client');
const MockAdapter = require('axios-mock-adapter');

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

  it('should create https instance', async () => {
    const rpc = new RPC({url: 'localhost', port: 443});

    assert.equal(rpc._url, 'https://localhost/');
  });

  it('should create localhost instance', async () => {
    const rpc = new RPC({url: 'localhost', port: 18222});

    assert.equal(rpc._url, 'http://localhost:18222/');
  });

  it('should inject port into URL', async () => {
    const port = 18222;
    const rpc = new RPC({url: 'https://ya.ru/test', port, auth: 'login:pass'});

    assert.equal(rpc._url, `https://ya.ru:${port}/test`);
  });

  it('should send request', async () => {
    const method = 'getBlock';
    const objRequest = {
      "strBlockHash": "cfe8271e30208557c3abd30919c858b2853ced063920ade5c67bd7ad9e369383"
    };
    const port = 18222;
    const rpc = new RPC({url: 'https://rpc-dv-1.ubikiri.com/', port, auth: 'cilTest:d49c1d2735536baa4de1cc6'});
    const mock = new MockAdapter(rpc._client);
    const objFakeResp = {id: 0, data: 'fake'};
//    mock.onPost().reply(200, objFakeResp);
    mock.onPost().reply(async (config) => {
      const data = JSON.parse(config.data);
      if (
        config.url === `https://rpc-dv-1.ubikiri.com:${port}/` &&
        data.method === method &&
        JSON.stringify(data.params) === JSON.stringify(objRequest)) {
        return [200, objFakeResp];
      }
      return [500];
    });

    const resp = await rpc.request(method, objRequest);

    assert.deepEqual(resp, objFakeResp);
  });
});
