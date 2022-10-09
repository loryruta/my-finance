const bcrypt = require('bcrypt');
const db = require('./db');
const config = require('../../config'); // TODO

const bcryptSaltRounds = 10;

async function insertUser(username, password) {
    const digest = bcrypt.hashSync(password, bcryptSaltRounds);
    await db.query(`INSERT INTO users ("user", "password_digest") VALUES ($1, $2)`, [username, digest]);
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------

(async () => {

    try {
        await db.query(`BEGIN`);

        // Users
        for (let user of config.users) {
            await insertUser(user.username, user.password);
            console.log(`Inserted user: "${user.username}"`);
        }

        await db.query(`COMMIT`);

    } catch (error) {
    }
    
    console.log(`DB seeded`);

    await db.end();
})();
