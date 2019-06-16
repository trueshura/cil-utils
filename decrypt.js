const assert = require('assert');
const factory = require('chain-in-law');
const commandLineArgs = require('command-line-args');
const readline = require('readline');

let {password} = readCmdLineOptions();

// ENCODE_SECRET=ac44f866ba9a97bdc3a5c2fd9dc540fb87a5692fcac664b4fac725bc1d39dd3c

;(async () => {
    const encryptedText = await questionAsync('Enter encrypted text: ', true);
    if (!password) password = await questionAsync('Enter password: ', true);

    const decryptedText = await factory.Crypto.decrypt(password, encryptedText);
    console.log(decryptedText.toString('hex'));
})()
    .catch(err => {
        console.error(err);
        process.exit(1);
    })
    .then(_ => {
        process.exit(0);
    });

function readCmdLineOptions() {
    const optionDefinitions = [
        {name: "password", type: String, multiple: false}
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
