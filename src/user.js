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

    async destroyWallet(walletId) {
        await db.query("DELETE FROM wallets WHERE id_user=$1 AND id=$2", [this.id, walletId]); // id_user for security
    }

    async getSelectedWallet() {
        let result = await db.query(`
            SELECT id_selected_wallet
            FROM users AS t1
            WHERE
                id=$1 AND
                EXISTS (
                    SELECT 1 FROM wallets AS t2
                    WHERE
                        t2.id = t1.id_selected_wallet AND
                        t2.id_user = t1.id
                )
        `, [this.id]);
        if (result.rows.length > 0) {
            return new Wallet(result.rows[0]['id_selected_wallet']);
        } else {
            return null;
        }
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

