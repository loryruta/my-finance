import * as Util from "util";
import db from '@app/db';
import { Model } from './model';

class Wallet extends Model {
    constructor(id: number) {
        super("wallets", id);
    }

    async addVariation(amount: number, timestamp?, note?: string) {
        await db.all(`
            INSERT INTO variations (id_wallet, amount, timestamp, note)
            SELECT ?, ?, COALESCE(?, DATETIME('now')), ?`, [
            this.id,
            amount,
            timestamp,
            note
        ]);
    }

    async removeLastVariation() { // TODO typing
        let rows = await db.all(`
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
    
    async getVariations(period: 'day' | 'week' | 'month' | 'year') { // TODO typing
        if (!['day', 'week', 'month', 'year'].includes(period)) {
            throw "Bad idea!"; // Smartly avoid the risk of SQL injection
        }
        
        let sql = Util.format(`
            SELECT * FROM variations
            WHERE
                "id_wallet" = ? AND
                "timestamp" >= DATETIME('now', '-1 %s')
            ORDER BY "timestamp" ASC
        `, period);
        let rows = await db.all(sql, this.id);
        return rows;
    }
}

export {
    Wallet,
}
