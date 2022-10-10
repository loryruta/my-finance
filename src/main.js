const TelegramBot = require('node-telegram-bot-api');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
require('chartjs-adapter-moment');

const db = require('./db');
const { User } = require('./user');
const config = require('../config');
const { Wallet } = require('./wallet');

// ------------------------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------------------------

// Telegram bot
const bot = new TelegramBot(config.telegram.token, { polling: true });

const chartJsRenderer = new ChartJSNodeCanvas({ type: 'png', width: 800, height: 600 });

function convertCurrencyToNumber(currency) {
    return Number(currency.replace(/[^0-9.-]+/g, ""));
}

// ------------------------------------------------------------------------------------------------

let context = {};

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

        let rows = await db.all(`SELECT * FROM users WHERE "user"=$1`, [myUsername]);
        if (rows.length > 0) {
            const row = rows[0];
            const userId = row['id'];
            const storedPasswordDigest = row['password_digest'];
            const matched = await bcrypt.compare(myPassword, storedPasswordDigest);
            if (matched) {
                const sessionValidUntil = moment().add(1, 'week');
                
                await db.run(`BEGIN`);
                await db.run(`DELETE FROM sessions WHERE id_user=$1`, [userId]);
                await db.run(`INSERT INTO sessions (id_chat, id_user, valid_until) VALUES ($1, $2, $3)`, [chatId, userId, sessionValidUntil]);
                await db.run(`COMMIT`);

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
    let rows = await db.all(`SELECT * FROM sessions WHERE id_chat=$1`, [chatId]);
    if (rows.length === 0 /* TODO || invalid session */) {
        return null;
    } else {
        return rows[0]['id_user'];
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

    await db.run(`DELETE FROM sessions WHERE id_chat=$1`, [chatId]);

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

const onDestroyWalletCommand = requireSelectedWallet(requireLogin(async function (message) {
    const chatId = message.chat.id;
    const user = await getUserFromChatId(chatId);
    const wallet = await user.getSelectedWallet();

    await bot.sendMessage(chatId, `Are you sure you want to __*permanently destroy*__ the wallet "${await wallet.getAttribute("title")}"?`, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes", callback_data: 'y' }],
                [{ text: "No", callback_data: 'n' }]
            ]
        }
    });

    context[chatId] = { 
        callbackQuery: "confirm_destroy_wallet",
        toDestroyWalletId: wallet.id,
    };
}));

const onSelectWalletCommand = requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);
    const wallets = await user.getWallets();

    if (wallets.length == 0) {
        await bot.sendMessage(chatId, "You don't have any wallet. Use /create <title>");
        return;
    }

    let inlineKeyboard = [];
    for (let wallet of wallets) {
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

    if (!matches || !matches[2] || isNaN(parseFloat(matches[2]))) {
        await bot.sendMessage(chatId, "Invalid usage: /add <amount> [note]");
        return;
    }

    let amount = parseFloat(matches[2]);
    let note = matches[3];

    await wallet.addVariation(amount, null, note); // timestamp can't be specified by this command

    await bot.sendMessage(chatId, `Added variation of ${amount}${note ? ` "${note}"`: ''}`);
}));

const onRemoveLastVariationCommand = requireSelectedWallet(requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);
    const wallet = await user.getSelectedWallet();

    let removedVariation = await wallet.removeLastVariation();
    if (removedVariation) {
        await bot.sendMessage(chatId, `Removed variation #${removedVariation.id} of ${removedVariation.amount} dated ${moment(removedVariation.timestamp).format('lll')}`);
    } else {
        await bot.sendMessage(chatId, "No variation found: wallet is empty");
    }
}));

const onChartCommand = requireSelectedWallet(requireLogin(async function (message) {
    const chatId = message.chat.id;

    const user = await getUserFromChatId(chatId);
    const wallet = await user.getSelectedWallet();

    // TODO (VERY IMPORTANT): RATE LIMIT THE NUMBER OF CHARTS THAT CAN BE GENERATED

    const variations = await wallet.getVariations('month');

	const configuration = {
		type: "line",
		data: {
			datasets: [
                {
                    //label: await wallet.getAttribute("title"),
                    data: variations.map(variation => {
                        return {
                            x: variation.timestamp,
                            y: convertCurrencyToNumber(variation.incremental_amount)
                        };
                    }),
                    fill: false,
                    borderColor: 'red',
		    	}
            ]
		},
        options: {
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                xAxis: {
                    type: 'time', 
                },
            },
        },
	};

	const imageBuffer = await chartJsRenderer.renderToBuffer(configuration); // TODO USE STREAMS ?
    
    await bot.sendPhoto(
        chatId,
        imageBuffer,
        { caption: `Chart of wallet "${await wallet.getAttribute("title")}"` },
        { filename: 'chart.png', contentType: 'image/png' }
    );
}));

const commands = {
    "login": { description: "Login", callback: onLoginCommand },
    "logout": { description: "Logout", callback: onLogoutCommand },
    "create": { description: "Create a wallet", callback: onCreateWalletCommand },
    "destroy": { description: "Destroy the selected wallet", callback: onDestroyWalletCommand },
    "select": { description: "Select a wallet", callback: onSelectWalletCommand },
    "add": { description: "Add a variation", callback: onAddVariationCommand },
    "removelast": { description: "Remove last variation", callback: onRemoveLastVariationCommand },
    "chart": { description: "Show the chart of a wallet", callback: onChartCommand },
};

bot.setMyCommands(Object.keys(commands).map(command => {
    return {
        command: command,
        description: commands[command].description,
    };
}));

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

async function onConfirmDestroyWalletCallbackQuery(query) {
    const chatId = query.message.chat.id;

    const user = await getUserFromChatId(chatId);

    if (query.data === 'y') {
        const toDestroyWalletId = context[chatId].toDestroyWalletId;
        user.destroyWallet(toDestroyWalletId);
    
        await bot.sendMessage(chatId, `Wallet was permanently destroyed`);

        delete context[chatId].toDestroyWalletId;
    }

    return true;
}

// ------------------------------------------------------------------------------------------------
// Telegram event hooks
// ------------------------------------------------------------------------------------------------

bot.onText(/\/([^\s]+)/, async (message, match) => {
    const chatId = message.chat.id;

    if (!config.telegram.acceptedChatIds.includes(chatId)) {
        bot.sendMessage(chatId, "You're not allowed to use this bot");
        return;
    }

    const command = match[1];

    if (command in commands) {
        await commands[command].callback(message);
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
            'confirm_destroy_wallet': onConfirmDestroyWalletCallbackQuery
        };

        if (myCallbackQuery in callbackQueryHandlers && await callbackQueryHandlers[myCallbackQuery](query)) {
            await bot.answerCallbackQuery(query.id);
        }

        delete context[chatId].callbackQuery;
    }
});
