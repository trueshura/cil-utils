const CilUtils = require('./cilUtils');

main().then(() => {
}).catch((error) => {
    console.error(error);
});

async function main() {
    const utils = new CilUtils({
        privateKey: 'a'.repeat(64),
        apiUrl: 'https://explorer.ubikiri.com/api/',
        rpcPort: 443,
        rpcAddress: 'https://rpc-dv-1.ubikiri.com/',
        rpcUser: 'cilTest',
        rpcPass: 'd49c1d2735536baa4de1cc6'
    });

    await utils.asyncLoaded();

    const result = await utils.queryApi('Unspent', 'a7f1cadf954440a26bba838ace6a1c200464f684');
    console.dir(result, {colors: true, depth: null});

    const rpcResult = await utils.queryRpcMethod('getTips', {});
    console.dir(rpcResult, {colors: true, depth: null});
}
