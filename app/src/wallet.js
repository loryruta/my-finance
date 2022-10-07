const db = require("./db");
const { Model } = require('./model');
const pgFormat = require('pg-format');

class Wallet extends Model {
    constructor(id) {
        super("wallets", id);
    }

    async addVariation(amount, timestamp, note) {
        await db.query(`
            INSERT INTO variations (id_wallet, amount, timestamp, note, incremental_amount)
            SELECT $1, $2, COALESCE($3, NOW()), $4, (
                SELECT COALESCE(SUM(amount), 0::money) + $2::money FROM variations AS t1
                WHERE
                    t1.id_wallet = $1
            )`, [
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
    
    async getVariations(period) {
        let sql = pgFormat(`
            SELECT * FROM variations
            WHERE
                id_wallet = $1 AND
                timestamp >= now() - interval '1 %I'
        `, period);
        let result = await db.query(sql, [this.id]);
        return result.rows;
    }
}

module.exports = {
    Wallet,
};
