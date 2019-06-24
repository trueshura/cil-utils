const assert = require('assert');
const commandLineArgs = require('command-line-args');
const readline = require('readline');

const CilUtils = require('./cilUtils');
const Config = require('./config');

// Читаем опции
const options = readCmdLineOptions();
let {fundsPk, receiverAddr, amount, nOutputs, justCreateTx} = options;

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

    const tx = await utils.createTxWithFunds(receiverAddr, amount, nOutputs);
    if (justCreateTx) {
        console.log(`Here is your tx: "${tx.encode().toString('hex')}"`);
        console.log(`You can send it via RPC.sendRawTx call`);
    } else {
        await utils.sendTx(tx);
        console.log(`Tx ${tx.getHash()} successfully sent`);
    }
}

function readCmdLineOptions() {
    const {
        RPC_ADDRESS,
        RPC_PORT,
        FEE_DEPLOY,
        FEE_PER_INPUT_OUTPUT,
        DEFAULT_NUM_OUTPUTS
    } = Config;

    const optionDefinitions = [
        {name: "rpcAddress", type: String, multiple: false, defaultValue: RPC_ADDRESS},
        {name: "rpcPort", type: Number, multiple: false, defaultValue: RPC_PORT},
        {name: "nFeePerInputOutput", type: Number, multiple: false, defaultValue: FEE_PER_INPUT_OUTPUT},
        {name: "nFeeDeploy", type: Number, multiple: false, defaultValue: FEE_DEPLOY},
        {name: "fundsPk", type: String, multiple: false},
        {name: "receiverAddr", type: String, multiple: false},
        {name: "amount", type: Number, multiple: false},
        {name: "nOutputs", type: Number, multiple: false, defaultValue: DEFAULT_NUM_OUTPUTS},
        {name: "justCreateTx", type: Boolean, multiple: false, defaultValue: false}
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
