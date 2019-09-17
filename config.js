let apiUrl;
let port;
if (process.env.NODE_ENV === 'Devel') {
    apiUrl = 'https://test-explorer.ubikiri.com/api/';
    port = 18222;
} else {
    apiUrl = 'https://explorer.ubikiri.com/api/';
    port = 8222;
}

module.exports = {
    RPC_ADDRESS: 'localhost',
    RPC_PORT: port,

    // на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
    DEFAULT_NUM_OUTPUTS: 1,
    FEE_PER_INPUT_OUTPUT: parseInt(4000 / 1024 * 112),
    API_URL: apiUrl
};
