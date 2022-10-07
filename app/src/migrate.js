const db = require('./db');
const fs = require('fs');
const path = require('path');

(async () => {
    let result;
    result = await db.query(`
        SELECT "filename" FROM "migrations"
        WHERE
            "timestamp" >= ALL(
                SELECT "timestamp" FROM migrations
            )
    `);

    let lastMigration = result.rows.length > 0 ? result.rows[0]['filename'] : null;
    let applyMigrations = lastMigration === null;

    for (let migration of fs.readdirSync('migrations')) {
        if (applyMigrations) {
            console.log(`Applying migration: ${migration}`);

            const migrationSql = fs.readFileSync(path.join('migrations', migration)).toString();

            await db.query(`BEGIN`);
            await db.query(migrationSql);
            await db.query(`INSERT INTO "migrations" (filename, timestamp) VALUES ($1, NOW())`, [migration]);
            await db.query(`COMMIT`);
        }

        if (lastMigration === migration) {
            applyMigrations = true;
        }
    }

    console.log("DB successfully migrated");
})();

