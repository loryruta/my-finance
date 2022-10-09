const { Pool } = require('pg');
const config = require('../../config'); // TODO Awful relative path

const pool = new Pool({
    host: config.pgsql.host,
    port: config.pgsql.port,
    database: config.pgsql.database,
    user: config.pgsql.user,
    password: config.pgsql.password,
});

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

async function end() {
    await pool.end();
}

module.exports = {
    getConnection,
    query,
    end,
};
