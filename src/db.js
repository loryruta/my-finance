const config = require('../configs/app');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(config.dbFile);

async function all(sql, params) {
    return await new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error != null) {
                reject(error);
            } else {
                resolve(rows);
            }
        });
    });
}

async function run(sql, params) {
    return await new Promise((resolve, reject) => {
        db.run(sql, params, function (error, rows) {
            if (error != null) {
                reject(error);
            } else {
                resolve(this);
            }
        });
    });
}

async function exec(sql) {
    return await new Promise((resolve, reject) => {
        db.run(sql, function (error) {
            if (error != null) {
                reject(error);
            } else {
                resolve(this);
            }
        });
    });
}

async function close() {
    return new Promise((resolve, reject) => {
        db.close(error => {
            if (error != null) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    all,
    run,
    exec,
    close,
};
