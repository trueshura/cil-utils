const assert = require('assert');
const factory = require('chain-in-law');
const commandLineArgs = require('command-line-args');

const {fundsPk} = readCmdLineOptions();
assert(fundsPk, 'Specify --fundsPk');

const kpOwner = factory.Crypto.keyPairFromPrivate(fundsPk);
console.log(kpOwner.address);

function readCmdLineOptions() {
    const optionDefinitions = [
        {name: "fundsPk", type: String, multiple: false}
    ];
    return commandLineArgs(optionDefinitions, {camelCase: true});
}
