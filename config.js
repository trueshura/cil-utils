let apiUrl;
let port;
let conciliumTwoAddr;
let conciliumTwoRpcUser;
let conciliumTwoRpcPass;

if (process.env.NODE_ENV === 'Devel') {
  apiUrl = 'https://test-explorer.ubikiri.com/api/';
  port = 18222;
  conciliumTwoAddr = 'rpc-dv-1.ubikiri.com';
  conciliumTwoRpcUser = 'cilTest';
  conciliumTwoRpcPass = 'd49c1d2735536baa4de1cc6';
} else {
  apiUrl = 'https://explorer.ubikiri.com/api/';
  port = 443;
  conciliumTwoAddr = 'rpc-pr-1.ubikiri.com';
  conciliumTwoRpcUser = 'ubikiri';
  conciliumTwoRpcPass = '622ca88c4e2ea80217';
}

module.exports = {
  RPC_ADDRESS: conciliumTwoAddr,
  RPC_PORT: port,
  RPC_USER: conciliumTwoRpcUser,
  PRC_PASS: conciliumTwoRpcPass,

  // на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
  DEFAULT_NUM_OUTPUTS: 1,
  FEE_PER_INPUT_OUTPUT: parseInt(4000 / 1024 * 112),
  API_URL: apiUrl,
  conciliumTwoAddr,
  conciliumTwoRpcUser,
  conciliumTwoRpcPass
};
