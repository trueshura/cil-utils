const buffer = require('buffer/').Buffer;
const axios = require('axios').default;
const {assert} = require('./misc');

const cUrl = URL ? URL : require('url').URL;

module.exports = class Client {
  constructor({url, port, auth}) {
    assert(url, 'Specify url');

    const bSsl = port === 443;
    const strProtoPrefix = bSsl ? 'https' : 'http';
    const strTempUrl = url.startsWith('http') ? url : `${strProtoPrefix}://${url}`;
    const myUrl = new cUrl(strTempUrl);
    myUrl.port = port;
    this._url = myUrl.toString();

    const authMixin = auth ? {
      Authorization: `Basic ${buffer.from(auth).toString('base64')}`
    } : {};

    this._baseCfg = {
      method: 'post',
      url: this._url,
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        ...authMixin
      }
    };

    this._client = axios.create(this._baseCfg);
  }

  set client(client) {
    this._client = client;
  }

  async request(strMethod, objParams) {
    const resp = await this._client.post(
      this._url,
      this._createData(strMethod, objParams),
      this._baseCfg
    );
    return resp.data;
  }

  _createData(strMethod, objParams = {}, seqId = 0) {
    return {
      "jsonrpc": "2.0",
      "method": strMethod,
      "params": objParams,
      "id": seqId
    };
  }
};
