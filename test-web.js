const CilUtils = require('./cilUtils');

main().then(() => {
}).catch((error) => {
  console.error(error);
});

async function main() {
  const utils = new CilUtils({

    // Обратить внимание, что тут тестовая сеть
    privateKey: 'a'.repeat(64),
    apiUrl: 'https://test-explorer.ubikiri.com/api/',
    rpcPort: 443,
    rpcAddress: 'https://rpc-dv-1.ubikiri.com/',
    rpcUser: 'cilTest',
    rpcPass: 'd49c1d2735536baa4de1cc6'
  });

  await utils.asyncLoaded();

  const result = await utils.queryApi('Unspent', '0d5ab318f38a8e4faed56d625a677ba481c9022b');
  console.dir(result, {colors: true, depth: null});

  const rpcResult = await utils.queryRpcMethod('getTips', {});
  console.dir(rpcResult, {colors: true, depth: null});

  const objTokenData = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'WAF');
  const objTokenData2 = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'ZZZ');
  console.dir(objTokenData, {colors: true, depth: null});
  console.dir(objTokenData2, {colors: true, depth: null});

  const txFunds = await utils.createSendCoinsTx([
    ['Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86', 1123],
    ['a'.repeat(40), 999]
  ], 0);
  await utils.sendTx(txFunds);

  await utils.waitTxDoneExplorer(txFunds.getHash(), 600, false);

  const txTokens = await utils.createSendTokenTx(
    'a'.repeat(40),
    10,
    'TST-EM',
    'Ux5560c0ee0c7ffdc4ccb033056fcc95c1974c3ed1',
    1
  );
  await utils.sendTx(txTokens);
}
