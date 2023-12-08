const buffer = require('buffer/').Buffer;
const axios = require('axios');
const {assert} = require('./misc');
module.exports = class Client {
    constructor({url, port, auth}) {
        assert(this._url = url, 'Specify url');
        this._port = port;

        // TODO add port support

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
    }

    set client(val) {

    }

    async request(strMethod, objParams) {
        const resp = await axios.post(
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
