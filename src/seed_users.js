const bcrypt = require('bcrypt');
const db = require('./db');
const config = require('./config')

const bcryptSaltRounds = 10;

function insertUser(username, password) {
    bcrypt.hash(password, bcryptSaltRounds, async (error, hash) => {
        await db.query(`INSERT INTO users ("user", "password_digest") VALUES ($1, $2)`, [username, hash]);
    });
}

for (let user of config["users"]) {
    insertUser(user["username"], user["password"]);
}
