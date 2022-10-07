const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool();

async function getConnection() {
    let startedAt = Date.now();

    let client = null;
    while (client === null) {
        try {
            client = await pool.connect();
        } catch (error) {
            let elapsedTime = (Date.now() - startedAt) / 1000;
            console.error(`DB connection trial failed. ${elapsedTime.toFixed(1)}s passed...`);

            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    return client;
}

async function query(text, params) {
    const client = await getConnection();
    try {
        return client.query(text, params);
    } finally {
        client.release();
    }
}

module.exports = {
    getConnection,
    query,
};
