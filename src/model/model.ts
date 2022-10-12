import db from "@app/db";
import * as Util from "util";

class Model {
    readonly table: string;
    readonly id: number;

    constructor(table: string, id: number) {
        this.table = table;
        this.id = id;
    }

    async getAttribute(key: string): Promise<any | undefined> {
        const sql = Util.format(`SELECT "%s" FROM "%s" WHERE id=?`, key, this.table);
        const rows = await db.all(sql, [this.id]);
        if (rows.length > 0) {
            return rows[0][key];
        } else {
            return undefined;
        }
    }

    async setAttribute(key: string, value: any): Promise<void> {
        const sql = Util.format(`UPDATE "%s" SET "%s"=? WHERE id=?`, this.table, key);
        await db.run(sql, [value, this.id]);
    }
}

export {
    Model,
}
