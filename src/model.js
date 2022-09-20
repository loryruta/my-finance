const db = require('./db');
const pgFormat = require('pg-format');

class Model {
    constructor(table, id) {
        this.table = table;
        this.id = id;
    }

    async getAttribute(key) {
        const sql = pgFormat("SELECT %I FROM %I WHERE id=$1", key, this.table);
        const result = await db.query(sql, [this.id]);
        if (result.rows.length > 0) {
            return result.rows[0][key];
        } else {
            return null;
        }
    }

    async setAttribute(key, value) {
        const sql = pgFormat("UPDATE %I SET %I=$1 WHERE id=$2", this.table, key);
        await db.query(sql, [value, this.id]);
    }
}

module.exports = {
    Model,
};
