const assert = require('assert');
const commandLineArgs = require('command-line-args');
const CilUtils = require('./cilUtils');
const Config = require('./config');

// Читаем опции
const options = readCmdLineOptions();
const {receiverAddr, amount, nOutputs} = options;

assert(options.fundsPk, 'Specify --fundsPk');
assert(receiverAddr, 'Specify --receiverAddr');
assert(amount, 'Specify --amount');

const utils = new CilUtils({
    ...options,
    privateKey: fundsPk
});

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
    await utils.faucet(receiverAddr, amount, nOutputs);
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
        {name: "nOutputs", type: Number, multiple: false, defaultValue: DEFAULT_NUM_OUTPUTS}
    ];
    return commandLineArgs(optionDefinitions, {camelCase: true});
}
