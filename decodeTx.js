const assert = require('assert');
const factory = require('chain-in-law');
const commandLineArgs = require('command-line-args');
const readline = require('readline');

;(async () => {
    const strTx = await questionAsync('Enter serialized tx:');
    const tx = new factory.Transaction(Buffer.from(strTx, 'hex'));
    console.dir(factory.utils.prepareForStringifyObject(tx.rawData), {colors: true, depth: null});
})()
    .catch(err => {
        console.error(err);
        process.exit(1);
    })
    .then(_ => {
        process.exit(0);
    });

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
