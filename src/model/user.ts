import db from '@app/db';
import { Model } from './model';
import { Wallet } from './wallet';

class User extends Model {
    constructor(id: number) {
        super("users", id);
    }

    async createWallet(title: string): Promise<void> {
        await db.run("INSERT INTO wallets (id_user, title) VALUES (?, ?)", this.id, title);
    }

    async destroyWallet(walletId: number): Promise<void> {
        await db.run("DELETE FROM wallets WHERE id_user=? AND id=?", this.id, walletId); // id_user for security
    }

    async getSelectedWallet(): Promise<Wallet | undefined> {
        let rows = await db.all(`
            SELECT id_selected_wallet
            FROM users AS t1
            WHERE
                id=? AND
                EXISTS (
                    SELECT 1 FROM wallets AS t2
                    WHERE
                        t2.id = t1.id_selected_wallet AND
                        t2.id_user = t1.id
                )
        `, this.id);
        if (rows.length > 0) {
            return new Wallet(rows[0]['id_selected_wallet']);
        } else {
            return undefined;
        }
    }

    async getWalletCount(): Promise<number> {
        let rows = await db.all("SELECT COUNT(*) AS \"result\" FROM wallets WHERE id_user=?", this.id);
        return rows[0]['result'];
    }

    async getWallets(): Promise<Wallet[]> {
        let rows = await db.all("SELECT id FROM wallets WHERE id_user=?", this.id);
        return rows.map(row => new Wallet(row['id']));
    }

    async getVariations(period = 'month', walletTitleRegex = '*') {
        if (!['day', 'week', 'month', 'year'].includes(period)) {
            throw "Bad idea!"; // Smartly avoid the risk of SQL injection
        }

        let rows = await db.all(`
            SELECT * FROM variations
            WHERE
                id_wallet IN (
                    SELECT id FROM wallets
                    WHERE
                        id_user = ? AND
                        title LIKE ?
                ) AND
                "timestamp" >= DATETIME('now', '-1 ${period}')
            ORDER BY "timestamp" ASC
            LIMIT 1024
        `, this.id, walletTitleRegex);
        return rows;
    }
}

export {
    User,
}

