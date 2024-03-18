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
    rpcAddress: 'rpc-dv-1.ubikiri.com',
    rpcUser: 'cilTest',
    rpcPass: 'd49c1d2735536baa4de1cc6'
  });

  await utils.asyncLoaded();

//  // Low level calls
//  const result = await utils.queryApi('Unspent', '0d5ab318f38a8e4faed56d625a677ba481c9022b');
//  console.dir(result, {colors: true, depth: null});
//
//  const rpcResult = await utils.queryRpcMethod('getTips', {});
//  console.dir(rpcResult, {colors: true, depth: null});

  // existed token
  const objTokenData = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'TST-EM');
  console.dir(objTokenData, {colors: true, depth: null});

  // non-existed token
  const objTokenData2 = await utils.getTokenBalance('0d5ab318f38a8e4faed56d625a677ba481c9022b', 'ZZZ');
  console.dir(objTokenData2, {colors: true, depth: null});

  // all token for stored PK
  const arrTokenData3 = await utils.getTokenBalance();
  console.dir(arrTokenData3, {colors: true, depth: null});  // all token for stored PK

  const nBalance = await utils.getBalance();
  console.log(nBalance);

  //посмотреть список транзакций
  const txList = await utils.getTXList();
  console.log(txList, 'список транзакций');

  const txListPage2 = await utils.getTXList(undefined, 2);
  console.log(txListPage2, 'список транзакций (страница 2 (НЕ 1!!))');

  //посмотреть список транзакций с токеноми
  const txTokensList = await utils.getTokensTXList();
  console.log(txTokensList, 'список транзакций с токеноми');

  const txTokensListPage2 = await utils.getTokensTXList(undefined, 2);
  console.log(txTokensListPage2, 'список транзакций с токеноми (страница 2 (НЕ 1!!))');

  const txTokensListAddr = await utils.getTokensTXList('9dd718fff5671d6cff6be4b15fde1ea286528ea0');
  console.log(txTokensListAddr, 'список транзакций по указанному адресу');


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

  const didUtils = new CilUtils({
    privateKey: '4e0adbf70b332c40378ac9d738aaa8d8d1cadabe41dace19c12444cbf2506334',
    apiUrl: 'https://test-explorer.ubikiri.com/api/',
    rpcPort: 443,
    rpcAddress: 'https://rpc-dv-1.ubikiri.com/',
    rpcUser: 'cilTest',
    rpcPass: 'd49c1d2735536baa4de1cc6'
  });

  await didUtils.asyncLoaded();

  // добавление нового провайдера DID
  const didProviderTX = await didUtils.performDIDOperation(
      'addProvider',
      ['tw'],
      '44abd42dcd3d3def73dbf9aac211d9a966e653b4',
      200000,
      20000,
      1
  )
  await didUtils.sendTx(didProviderTX);
  await didUtils.waitTxDoneExplorer(didProviderTX.getHash(), 600, false);
  console.log(didProviderTX.getHash(), 'Хэш транзакции (добавление провайдера DID)');

  // создание привязки DID
  const createDIDTX = await didUtils.performDIDOperation(
      'create',
      ['tw', 'trueshura', '9dd718fff5671d6cff6be4b15fde1ea286528ea0'],
      '44abd42dcd3d3def73dbf9aac211d9a966e653b4',
      200000,
      20000,
      1
  )
  await didUtils.sendTx(createDIDTX);
  await didUtils.waitTxDoneExplorer(createDIDTX.getHash(), 600, false);
  console.log(createDIDTX.getHash(), 'Хэш транзакции (привязка DID)');

  // проверка привязки DID
  const did = await didUtils.getDIDInformation(
      'resolve',
      ['trueshura'],
      '44abd42dcd3d3def73dbf9aac211d9a966e653b4',
  )
  console.log(did, 'Информация о привязке DID');

  // доступные DID провайдеры
  const didProviders = await didUtils.getDIDInformation(
      'getProviders',
      [],
      '44abd42dcd3d3def73dbf9aac211d9a966e653b4',
  )
  console.log(didProviders, 'доступные DID провайдеры');
}
