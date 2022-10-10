const db = require("./db");
const { Model } = require('./model');
const util = require('util');

class Wallet extends Model {
    constructor(id) {
        super("wallets", id);
    }

    async addVariation(amount, timestamp, note) {
        await db.all(`
            INSERT INTO variations (id_wallet, amount, timestamp, note)
            SELECT ?, ?, COALESCE(?, DATETIME('now')), ?`, [
            this.id,
            amount,
            timestamp,
            note
        ]);
    }

    async removeLastVariation() {
        let rows = await db.run(`
            DELETE FROM variations AS t1
            WHERE
                t1."timestamp" >= (
                    SELECT MAX(t2 ."timestamp") FROM variations AS t2
                    WHERE t2.id_wallet = t1.id_wallet
                )
            RETURNING *
        `);

        if (rows.length > 0) {
            return rows[0];
        } else {
            return null;
        }
    }
    
    async getVariations(period) {
        let sql = util.format(`
            SELECT * FROM variations
            WHERE
                "id_wallet" = ? AND
                "timestamp" >= DATETIME('now', '-1 %s')
        `, period);
        let rows = await db.all(sql, [this.id]);
        return rows;
    }
}

module.exports = {
    Wallet,
};
