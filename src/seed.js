const bcrypt = require('bcrypt');
const db = require('./db');
const config = require('../config');

const bcryptSaltRounds = 10;

async function insertUser(username, password) {
    const digest = bcrypt.hashSync(password, bcryptSaltRounds);
    await db.run(`INSERT INTO users ("user", "password_digest") VALUES ($1, $2)`, [username, digest]);
}

async function main() {
    try {
        await db.run(`BEGIN`);

        // Users
        for (let user of config.users) {
            await insertUser(user.username, user.password);
            console.log(`Inserted user: "${user.username}"`);
        }

        await db.run(`COMMIT`);

    } catch (error) {
    }
    
    console.log(`DB seeded`);

    await db.close();
}

if (require.main === module) {
    main()
        .catch(console.error);
}
