const assert = require('assert');
const commandLineArgs = require('command-line-args');
const readline = require('readline');
const factory = require('chain-in-law');

const CilUtils = require('./cilUtils');
const Config = require('./config');

// Читаем опции
const options = readCmdLineOptions();
let {fundsPk, receiverAddr, amount, nOutputs, justCreateTx, utxo, amountHas} = options;

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);

  });

// ----------------------------

async function main() {
//  if (!fundsPk) fundsPk = await questionAsync('Enter PK with funds:', true);
  const fundsPk = 'e054b17f4b8f150bf3ae5f6721218e384dafed59031bbacae4e73948bfbb1a8c';
//  const strReceiverAddr = await questionAsync('Enter receiver address (empty line - finish):', false);
  const strReceiverAddr = 'b0b847a832b1e71da6ec66746a897b5ef8a48928';

  const utils = new CilUtils({
    ...options,
    privateKey: fundsPk
  });
  await utils.asyncLoaded();

  // this means we create TX offline with UTXOs

  const arrUtxos = await utils.getUtxos();

  const tx = createJoinTx(
    arrUtxos.slice(-800),
    1,
    strReceiverAddr,
    fundsPk
  );

  console.error(
    `Here is TX containment: ${JSON.stringify(CilUtils.prepareForStringifyObject(tx.rawData), undefined, 2)}`);

//  console.error('------------ Tx wasnt sent: uncomment below -------------');
  await utils.sendTx(tx);
  console.error(`Tx ${tx.getHash()} successfully sent`);
}

function readCmdLineOptions() {
  const {
    RPC_ADDRESS,
    RPC_PORT,
    RPC_USER = '',
    PRC_PASS = '',
    FEE_DEPLOY,
    FEE_PER_INPUT_OUTPUT,
    DEFAULT_NUM_OUTPUTS,
    API_URL
  } = Config;

  const optionDefinitions = [
    {name: "rpcAddress", type: String, multiple: false, defaultValue: RPC_ADDRESS},
    {name: "rpcPort", type: Number, multiple: false, defaultValue: RPC_PORT},
    {name: "rpcUser", type: String, multiple: false, defaultValue: RPC_USER},
    {name: "rpcPass", type: String, multiple: false, defaultValue: PRC_PASS},
    {name: "nFeePerInputOutput", type: Number, multiple: false, defaultValue: FEE_PER_INPUT_OUTPUT},
    {name: "nFeeDeploy", type: Number, multiple: false, defaultValue: FEE_DEPLOY},
    {name: "fundsPk", type: String, multiple: false},
    {name: "receiverAddr", type: String, multiple: true},
    {name: "amount", type: Number, multiple: true},
    {name: "nOutputs", type: Number, multiple: false, defaultValue: DEFAULT_NUM_OUTPUTS},
    {name: "justCreateTx", type: Boolean, multiple: false, defaultValue: false},
    {name: "utxo", type: String, multiple: true},
    {name: "apiUrl", type: String, multiple: false, defaultValue: API_URL},
    {name: "amountHas", type: Number, multiple: false}
  ];
  return commandLineArgs(optionDefinitions, {camelCase: true});
}

function questionAsync(prompt, password = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      if (password) {
        if (process.stdout.moveCursor) process.stdout.moveCursor(0, -1);
        if (process.stdout.clearLine) process.stdout.clearLine();
      }
      resolve(answer.trim());
    });
  });
}

function createJoinTx(arrUtxos, nConciliumId, strReceiver, strPkOwner) {
  const tx = new factory.Transaction();
  tx.conciliumId = nConciliumId;
  let nInputs = 0;
  let nTotalAmount = 0;

  for (let utxo of arrUtxos) {
    nTotalAmount += utxo.amount;
    tx.addInput(utxo.hash, utxo.nOut);
    nInputs++;
  }

  const fee = nInputs * Math.round(factory.Constants.fees.TX_FEE * 0.04) + factory.Constants.fees.TX_FEE * 0.12;
  tx.addReceiver(nTotalAmount - fee, Buffer.from(strReceiver, 'hex'));

  tx.signForContract(strPkOwner);

  logger.debug(`Created TX with ${tx.inputs.length} inputs`);

  return tx;
}
