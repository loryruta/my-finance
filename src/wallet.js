const db = require("./db");
const { Model } = require('./model');

class Wallet extends Model {
    constructor(id) {
        super("wallets", id);
    }

    async addVariation(amount, timestamp, note) {
        await db.query(`INSERT INTO variations (id_wallet, amount, timestamp, note) VALUES ($1, $2, COALESCE($3, NOW()), $4)`, [
            this.id,
            amount,
            timestamp,
            note
        ]);
    }

    async removeLastVariation() {
        let result = await db.query(`
            DELETE FROM variations AS t1
            WHERE
                t1."timestamp" >= ALL(SELECT t2."timestamp" FROM variations AS t2 WHERE t2.id_wallet = t1.id_wallet)
            RETURNING *
        `);

        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            return null;
        }
    }
}

module.exports = {
    Wallet,
};
