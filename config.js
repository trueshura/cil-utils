module.exports = {
    RPC_ADDRESS: 'localhost',
    RPC_PORT: 18222,

    // на сколько частей побить сумму (для того, чтобы не ждать стабильности блоков)
    DEFAULT_NUM_OUTPUTS: 1,
    FEE_PER_INPUT_OUTPUT: parseInt(4000 / 1024 * 112)
};
