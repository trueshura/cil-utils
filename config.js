let apiUrl;
let port;
let rpcAddr;
let rpcUser;
let rpcPass;

if (process.env.NODE_ENV === 'Devel') {
  apiUrl = 'https://test-explorer.ubikiri.com/api/';
  port = 18222;
  rpcAddr = 'rpc-dv-1.ubikiri.com';
  rpcUser = 'cilTest';
  rpcPass = 'd49c1d2735536baa4de1cc6';
} else {
  apiUrl = 'https://explorer.ubikiri.com/api/';
  port = 443;
  rpcAddr = 'rpc-pr-1.ubikiri.com';
  rpcUser = 'ubikiri';
  rpcPass = '622ca88c4e2ea80217';
}

module.exports = {
  RPC_ADDRESS: rpcAddr,
  RPC_PORT: port,
  RPC_USER: rpcUser,
  PRC_PASS: rpcPass,

  // на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
  DEFAULT_NUM_OUTPUTS: 1,
  FEE_PER_INPUT_OUTPUT: parseInt(4000 / 1024 * 112),
  API_URL: apiUrl,
};
