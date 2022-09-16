const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

let db;
(async () => {
    console.log("Connecting to the DB...");
    
    db = new Client({
        host: process.env['PGSQL_HOST'],
        port: process.env['PGSQL_PORT'],
        database: process.env['PGSQL_DATABASE'],
        user: process.env['PGSQL_USERNAME'],
        password: process.env['PGSQL_PASSWORD'],
    });
    await db.connect();

    console.log("Done");
})();

module.exports = db;
