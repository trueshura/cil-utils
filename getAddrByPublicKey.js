const assert = require('assert');
const factory = require('chain-in-law');
const commandLineArgs = require('command-line-args');

const {fundsPubKey} = readCmdLineOptions();
assert(fundsPubKey, 'Specify --fundsPubKey');

const kpOwner = factory.Crypto.keyPairFromPublic(fundsPubKey);
console.log(kpOwner.address);

function readCmdLineOptions() {
    const optionDefinitions = [
        {name: "fundsPubKey", type: String, multiple: false}
    ];
    return commandLineArgs(optionDefinitions, {camelCase: true});
}
