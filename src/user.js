const db = require("./db");
const { Model } = require('./model');
const { Wallet } = require('./wallet');

class User extends Model {
    constructor(id) {
        super("users", id);
    }

    async createWallet(title) {
        await db.query("INSERT INTO wallets (id_user, title) VALUES ($1, $2)", [this.id, title]);
    }

    async getSelectedWallet() {
        const selectedWalletId = await this.getAttribute("id_selected_wallet");
        return selectedWalletId !== null ? new Wallet(selectedWalletId) : null;   
    }

    async getWalletCount() {
        let result = await db.query("SELECT COUNT(*) AS \"result\" FROM wallets WHERE id_user=$1", [this.id]);
        return result.rows[0]['result'];
    }

    async getWallets() {
        let result = await db.query("SELECT id FROM wallets WHERE id_user=$1", [this.id]);
        return result.rows.map(row => new Wallet(row['id']));
    }
}

module.exports = {
    User,
};

