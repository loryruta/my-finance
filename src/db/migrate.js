const db = require('./db');
const fs = require('fs');
const path = require('path');

async function createMigrationTable() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS "migrations" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "filename" VARCHAR(1024) NOT NULL,
            "timestamp" TIMESTAMP WITHOUT TIME ZONE NOT NULL
        );
    `);
}

async function main() {
    await createMigrationTable();

    let result = await db.all(`
        SELECT "filename" FROM "migrations"
        WHERE
            "timestamp" >= (
                SELECT MAX("timestamp") FROM migrations
            )
    `);

    let lastMigration = result.length > 0 ? result[0]['filename'] : null;
    let applyMigrations = lastMigration === null;

    for (let migration of fs.readdirSync('migrations')) {
        if (applyMigrations) {
            console.log(`Applying migration: ${migration}`);

            // Yup, it goes like that :')
            let migrationQueries = fs.readFileSync(path.join('migrations', migration)).toString()
                .trim()
                .split(';');
            if (migrationQueries[migrationQueries.length - 1] === '') {
                migrationQueries.pop();
            }

            await db.run(`BEGIN`);
            for (let query of migrationQueries) {
                await db.run(query);
            }
            await db.run(`INSERT INTO "migrations" (filename, timestamp) VALUES (?, DATETIME('now'))`, [migration]);
            await db.run(`COMMIT`);
        }

        if (lastMigration === migration) {
            applyMigrations = true;
        }
    }

    console.log("DB migrated");

    await db.close();
}

if (require.main === module) {
    main()
        .catch(console.error);
}
