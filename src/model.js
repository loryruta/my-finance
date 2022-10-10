const db = require('./db');
const util = require('util');

class Model {
    constructor(table, id) {
        this.table = table;
        this.id = id;
    }

    async getAttribute(key) {
        const sql = util.format("SELECT `%s` FROM `%s` WHERE id=$1", key, this.table);
        const rows = await db.all(sql, [this.id]);
        if (rows.length > 0) {
            return rows[0][key];
        } else {
            return null;
        }
    }

    async setAttribute(key, value) {
        const sql = util.format("UPDATE `%s` SET `%s`=$1 WHERE id=$2", this.table, key);
        await db.run(sql, [value, this.id]);
    }
}

module.exports = {
    Model,
};
