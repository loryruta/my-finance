import bcrypt from 'bcrypt';
import db from '@app/db';
import config from '@app/config';

const bcryptSaltRounds = 10;

async function insertUser(username, password) {
    const passwordDigest = bcrypt.hashSync(password, bcryptSaltRounds);
    await db.run(`INSERT INTO "users" ("user", "password_digest") VALUES (?, ?)`, username, passwordDigest);
}

async function main() {
    // Users
    await db.run(`BEGIN`);
    for (let user of config().users) {
        try {
            await insertUser(user.username, user.password);
            console.log(`Inserted user: "${user.username}"`);
        } catch (error) {
            console.log(`"${user.username}" insertion failed`, error);
        }
    }
    await db.run(`COMMIT`);
    
    console.log(`DB seeded`);

    await db.close();
}

if (require.main === module) {
    main()
        .catch(console.error);
}
