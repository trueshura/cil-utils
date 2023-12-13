const CilUtils = require('./cilUtils');
const crypto = require('crypto-web');

main().then(() => {
}).catch((error) => {
  console.error(error);
});

async function main() {

    // Generate keypair (see https://github.com/trueshura/crypto-web/blob/master/src/port-crypto.js#L19)
  const kp = crypto.createKeyPair();
  console.log(kp.privateKey);

  const utils = new CilUtils({

    // Обратить внимание, что тут тестовая сеть
    // Для нескольких колешьков нужно будет создать несколько инстансов CilUtils
    privateKey: kp.privateKey,
    apiUrl: 'https://test-explorer.ubikiri.com/api/',
    rpcPort: 443,
    rpcAddress: 'https://rpc-dv-1.ubikiri.com/',
    rpcUser: 'cilTest',
    rpcPass: 'd49c1d2735536baa4de1cc6'
  });

  await utils.asyncLoaded();

  // Low level calls
  const result = await utils.queryApi('Unspent', '0d5ab318f38a8e4faed56d625a677ba481c9022b');
  console.dir(result, {colors: true, depth: null});

  const rpcResult = await utils.queryRpcMethod('getTips', {});
  console.dir(rpcResult, {colors: true, depth: null});

  // existed token
  const objTokenData = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'WAF');

  // non-existed token
  const objTokenData2 = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'ZZZ');
  console.dir(objTokenData, {colors: true, depth: null});
  console.dir(objTokenData2, {colors: true, depth: null});

  // Можно отправить сразу нескольким адресатам в 1 транзакции. Она будет сразу подписана.
  const txFunds = await utils.createSendCoinsTx([
    ['Ux1ac4cfe96bd4e2a3df3d5115b75557b9f05d4b86', 1123],
    ['a'.repeat(40), 999]
  ], 0);
  // Не забыть отправить ее в сеть
  await utils.sendTx(txFunds);

  // Дождаться ее выполнения
  await utils.waitTxDoneExplorer(txFunds.getHash(), 600, false);

  // Отправить токены. Если токен или контракт не правильный - все равно вызовется,
  // потратит монеты, но будет ошибка
  const txTokens = await utils.createSendTokenTx(
    'a'.repeat(40),
    10,
    'TST-EM',
    'Ux5560c0ee0c7ffdc4ccb033056fcc95c1974c3ed1',
    1
  );

  // Не забыть отправить ее в сеть
  await utils.sendTx(txTokens);
}
