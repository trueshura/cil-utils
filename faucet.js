const assert = require('assert');
const commandLineArgs = require('command-line-args');
const readline = require('readline');

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
    if (!fundsPk) fundsPk = await questionAsync('Enter PK with funds:', true);
    if (!receiverAddr) receiverAddr = await questionAsync('Enter receiver address:', false);
    if (!amount) amount = parseFloat(await questionAsync('Enter amount:', false));

    assert(fundsPk, 'Specify --fundsPk');
    assert(receiverAddr, 'Specify --receiverAddr');
    assert(amount, 'Specify --amount');

    const utils = new CilUtils({
        ...options,
        privateKey: fundsPk
    });

    // this means we create TX offline with UTXOs
    let arrCoins;
    let gatheredAmount;

    if (Array.isArray(utxo) && utxo.length) {
        assert(amountHas, 'Specify --amountHas. We need it to create change!');
        arrCoins = utxo.map(strUtxoIndex => {
            const [strHash, strIdx] = strUtxoIndex.split(',');
            return {hash: strHash.trim(), nOut: parseInt(strIdx)};
        });
        gatheredAmount = amountHas;
    } else {
        const arrUtxos = await utils.getUtxos();
        ({gathered: gatheredAmount, arrCoins} = utils.gatherInputsForAmount(arrUtxos, amount));

    }

    const tx = await utils.createTxWithFunds({
            arrCoins,
            gatheredAmount,
            receiverAddr,
            amount,
            nOutputs,
            nConciliumId: 1
        }
    );

    console.error(
        `Here is TX containment: ${JSON.stringify(CilUtils.prepareForStringifyObject(tx.rawData), undefined, 2)}`);

    if (justCreateTx) {
        console.error('Here is your tx. You can send it via RPC.sendRawTx call');
        console.log(tx.encode().toString('hex'));
    } else {
        console.error('------------ Tx wasnt sent: uncomment below -------------');
//        await utils.sendTx(tx);
//        console.error(`Tx ${tx.getHash()} successfully sent`);
    }
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
        {name: "receiverAddr", type: String, multiple: false},
        {name: "amount", type: Number, multiple: false},
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

