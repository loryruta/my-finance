const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcrypt');
const moment = require('moment');

const db = require('./db');
const { User } = require('./user');
const config = require('../config');
const { Wallet } = require('./wallet');

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

async function getUserIdFromChatId(chatId) {
    result = await db.query(`SELECT * FROM session WHERE id_chat=$1`, [chatId]);
    if (result.rows.length === 0 /* TODO || invalid session */) {
        return null;
    } else {
        return result.rows[0]['id_user'];
    }
}

async function getUserFromChatId(chatId) {
    const userId = await getUserIdFromChatId(chatId);
    return userId !== null ? new User(userId) : null;
}

// ------------------------------------------------------------------------------------------------
// Decorators
// ------------------------------------------------------------------------------------------------

function requireLogin(wrapped) {
    return async function (message) {
        const chatId = message.chat.id;

        if ((await getUserIdFromChatId(chatId)) === null) {
            bot.sendMessage(chatId, "You're not logged in. Use /login");
            return;
        }

        wrapped.apply(null, arguments);
    };
}

function requireSelectedWallet(wrapped) {
    return async function (message) {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);

        if ((await user.getSelectedWallet()) === null) {
            bot.sendMessage(chatId, "You've not selected any wallet. Use /select");
            return;
        }
    
        return wrapped.apply(this, arguments);
    };
}

// ------------------------------------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------------------------------------

const onLoginCommand = async function (message) {
    const chatId = message.chat.id;

    if ((await getUserIdFromChatId(chatId)) !== null) {
        bot.sendMessage(chatId, "You're already logged in. Use /logout");
        return;
    }

    context[chatId] = { login: true, };
    bot.sendMessage(chatId, "Insert your username");
}

const onLogoutCommand = requireLogin(async function (message) {
    const chatId = message.chat.id;

    await db.query(`DELETE FROM session WHERE id_chat=$1`, [chatId]);

    bot.sendMessage(chatId, "Successfully logged out");
});

const onCreateWalletCommand = requireLogin(async function (message) {
    const chatId = message.chat.id;
    const user = await getUserFromChatId(chatId);
    
    let matches = message.text.split(/\s(.*)/);
    if (matches[1] === undefined) {
        bot.sendMessage(chatId, "Invalid command usage: /create <title>");
        return;
    }

    const title = matches[1];
    if (title.length >= 256) {
        bot.sendMessage(chatId, "Title must be at most 256 characters");
        return;
    }

    if (user.getWalletCount() >= 5) {
        bot.sendMessage(chatId, "You reached your max number of wallets");
        return;
    }

    await user.createWallet(title);

    bot.sendMessage(chatId, `Wallet "${title}" created successfully`);
});

// removeWalletCommand ?

const onSelectWalletCommand = requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);

    let inlineKeyboard = [];
    for (let wallet of (await user.getWallets())) {
        inlineKeyboard.push([{
            text: await wallet.getAttribute("title"),
            callback_data: wallet.id,
        }]);
    }

    await bot.sendMessage(chatId, "Select a wallet", {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });

    context[chatId] = { callbackQuery: "select_wallet" };
});

const onAddVariationCommand = requireSelectedWallet(requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);
    const wallet = await user.getSelectedWallet();

    const matches = message.text.match(/(\/[^\s]+)\s([^\s]+)(?:\s+(.*))?/);

    let amount = parseFloat(matches[2]);
    let note = matches[3];

    if (isNaN(amount)) {
        await bot.sendMessage(chatId, "Invalid usage: /add <amount> [note]");
    } else {
        await wallet.addVariation(amount, null, note); // timestamp specified by another command
        
        await bot.sendMessage(chatId, "Variation added");
    }
}));

const onRemoveLastVariationCommand = requireSelectedWallet(requireSelectedWallet(requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);
    const wallet = await user.getSelectedWallet();

    let removedVariation = await wallet.removeLastVariation();
    if (removedVariation) {
        await bot.sendMessage(chatId, `Removed variation #${removedVariation.id} of ${removedVariation.amount} dated ${moment(removedVariation.timestamp).format('lll')}`);
    } else {
        await bot.sendMessage(chatId, "No variation found: wallet is empty");
    }
})));

// ------------------------------------------------------------------------------------------------
// Callback queries
// ------------------------------------------------------------------------------------------------

async function onSelectWalletCallbackQuery(query) {
    const chatId = query.message.chat.id;

    const selectedWalletId = query.data;
    const selectedWallet = new Wallet(selectedWalletId);
    
    const user = await getUserFromChatId(chatId);
    user.setAttribute("id_selected_wallet", selectedWalletId);

    const message = await bot.sendMessage(chatId, `Selected wallet "${await selectedWallet.getAttribute("title")}"`);
    await bot.unpinAllChatMessages(chatId);
    await bot.pinChatMessage(chatId, message.message_id);

    return true;
}

// ------------------------------------------------------------------------------------------------
// Telegram event hooks
// ------------------------------------------------------------------------------------------------

bot.onText(/\/([^\s]+)/, async (message, match) => {
    const chatId = message.chat.id;

    if (!config["acceptedChatId"].includes(chatId)) {
        bot.sendMessage(chatId, "You're not allowed to use this bot");
        return;
    }

    const command = match[1];

    const commandFunctions = {
        "login": onLoginCommand,
        "logout": onLogoutCommand,
        "create": onCreateWalletCommand,
        "select": onSelectWalletCommand,
        "add": onAddVariationCommand,
        "removelast": onRemoveLastVariationCommand, 
    };

    if (command in commandFunctions) {
        await commandFunctions[command](message);
    } else {
        // Nothing
    }
});

bot.on('callback_query', async query => {
    const chatId = query.message.chat.id;
    if (context[chatId] && context[chatId].callbackQuery) {
        const myCallbackQuery = context[chatId].callbackQuery;
        const callbackQueryHandlers = {
            'select_wallet': onSelectWalletCallbackQuery,
        };

        if (myCallbackQuery in callbackQueryHandlers && await callbackQueryHandlers[myCallbackQuery](query)) {
            await bot.answerCallbackQuery(query.id);
        }

        delete context[chatId].callbackQuery;
    }
});
