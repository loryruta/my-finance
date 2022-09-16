const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcrypt');
const moment = require('moment');

const db = require('./db');
const config = require('./config');

dotenv.config();

const botToken = process.env['TELEGRAM_BOT_TOKEN'];

const bot = new TelegramBot(botToken, {polling: true});

let context = {};
let result;

bot.setMyCommands([
    { command: "login", description: "Login" },
    { command: "create", description: "Create a wallet" },
    { command: "select", description: "Select a wallet" },
    { command: "add", description: "Add a variation" },
    { command: "removelast", description: "Remove the last variation inserted" },
]);

bot.on('message', async message => {
    const chatId = message.chat.id;
    const text = message.text;

    if (!context[chatId] || !context[chatId].login) {
        return;
    }

    if (context[chatId].username === undefined) {
        const myUsername = text;
        context[chatId].username = myUsername;
        
        bot.sendMessage(chatId, "Insert your password");
        return;
    }

    if (context[chatId].password === undefined) {
        const myUsername = context[chatId].username;
        const myPassword = text;

        let failed = true;

        result = await db.query(`SELECT * FROM users WHERE "user"=$1`, [myUsername]);
        if (result.rows.length > 0) {
            const row = result.rows[0];
            const userId = row['id'];
            const storedPasswordDigest = row['password_digest'];
            const matched = await bcrypt.compare(myPassword, storedPasswordDigest);
            if (matched) {
                const sessionValidUntil = moment().add(1, 'week');
                
                await db.query(`BEGIN`);
                await db.query(`DELETE FROM session WHERE id_user=$1`, [userId]);
                await db.query(`INSERT INTO session (id_chat, id_user, valid_until) VALUES ($1, $2, $3)`, [chatId, userId, sessionValidUntil]);
                await db.query(`COMMIT`);

                bot.sendMessage(chatId, "Logged in successfully");
                failed = false;
            }
        }

        if (failed) {
            bot.sendMessage(chatId, "Invalid username or password");
        }

        delete context[chatId];

        return;
    }
});

async function getUser(chatId) {
    result = await db.query(`SELECT * FROM session WHERE id_chat=$1`, [chatId]);
    if (result.rows.length === 0 /* TODO || invalid session */) {
        return null;
    }

    return result.rows[0]['id_user'];
}

async function onLoginCommand(message) {
    const chatId = message.chat.id;

    if ((await getUser(chatId)) !== null) {
        bot.sendMessage(chatId, "You're already logged in. Use /logout");
        return;
    }

    context[chatId] = { login: true, };
    bot.sendMessage(chatId, "Insert your username");
}

async function onLogoutCommand(message) {
    const chatId = message.chat.id;

    if ((await getUser(chatId)) === null) {
        bot.sendMessage(chatId, "You're not logged in");
        return;
    }

    await db.query(`DELETE FROM session WHERE id_chat=$1`, [chatId]);

    bot.sendMessage(chatId, "Successfully logged out");
}

bot.onText(/\/(.+)/, async (message, match) => {
    const chatId = message.chat.id;

    const command = match[1];

    switch (command) {
    case "login":
        await onLoginCommand(message);
        break;
    case "logout":
        await onLogoutCommand(message);
        break;
    default:
        if (!config["acceptedChatId"].includes(chatId)) {
            bot.sendMessage(chatId, "You're not allowed to use this bot.");
            return;
        }
    
        let user = await getUser(chatId);
        if (user === null) {
            bot.sendMessage(chatId, "No session found. You have to /login");
            return;
        }

        break;
    }
});

