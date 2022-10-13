import sqlite3, { RunResult } from 'sqlite3';
import config from "@app/config";

let verboseSqlite3 = sqlite3.verbose();

const db = new verboseSqlite3.Database(config().dbFile);

async function all(sql: string, ...params: any[]): Promise<any[]> {
    return await new Promise((resolve, reject) => {
        db.all(sql, ...params, (error, rows) => {
            if (error != null) {
                reject(error);
            } else {
                resolve(rows);
            }
        });
    });
}

async function run(sql: string, ...params: any[]): Promise<RunResult> {
    return await new Promise((resolve, reject) => {
        db.run(sql, ...params, function (error, rows) {
            if (error != null) {
                reject(error);
            } else {
                resolve(this);
            }
        });
    });
}

async function exec(sql: string): Promise<RunResult> {
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

async function close(): Promise<void> {
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

export = {
    all,
    run,
    exec,
    close,
};
