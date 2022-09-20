const { Model } = require('./model');

class Wallet extends Model {
    constructor(id) {
        super("wallets", id);
    }

    addVariation(variation) {

    }

    removeLastVariation(variation) {
    }
}

module.exports = {
    Wallet,
};
