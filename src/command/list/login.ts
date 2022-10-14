import { Message } from 'node-telegram-bot-api'
import bcrypt from 'bcrypt';
import { bot } from '@app/main';
import db from '@app/db';
import { createConversation } from '@app/conversation';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';

class LoginCommand implements Command {
    readonly name: string = 'login';
    readonly description: string = 'Login the user';

    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;

        if ((await getUserFromChatId(chatId)) != null) {
            await bot.sendMessage(chatId, `You're already logged in. Use /logout`);
            return;
        }
    
        const conversation = createConversation(bot, chatId);

        conversation.createRunNode('main', async () => {
            await bot.sendMessage(chatId, `Insert your username`);
            conversation.setActiveNode('insert_username');
        });

        conversation.createOnMessageNode('insert_username', async (message: Message) => {
            conversation.userData.username = message.text;

            await bot.sendMessage(chatId, `Insert your password`);
            conversation.setActiveNode('insert_password');
        });

        conversation.createOnMessageNode('insert_password', async (message: Message) => {
            const chatId = conversation.chatId;
    
            conversation.userData.password = message.text;

            await bot.deleteMessage(chatId, message.message_id.toString());  // Delete the password message soon after reading to enhance security

            conversation.setActiveNode('try_login');
        });

        conversation.createRunNode('try_login', async () => {
            const chatId = conversation.chatId;
            const {
                username,
                password,
            } = conversation.userData;

            let failed = true;
        
            let rows = await db.all(`SELECT * FROM "users" WHERE "user"=?`, username);
            if (rows.length > 0) {
                const row = rows[0];
                const userId = row['id'];
                const storedPasswordDigest = row['password_digest'];
                const matched = await bcrypt.compare(password, storedPasswordDigest);
                if (matched) {
                    await db.run(`BEGIN`);
                    await db.run(`DELETE FROM sessions WHERE id_user=?`, userId);
                    await db.run(`INSERT INTO sessions (id_chat, id_user, valid_until) VALUES (?, ?, DATETIME('now', '+7 days'))`, chatId, userId);
                    await db.run(`COMMIT`);

                    await bot.sendMessage(chatId, `Logged in successfully`);
                    failed = false;
                }
            } else {
                console.error(`User not found for "${username}"`);
            }
        
            if (failed) {
                await bot.sendMessage(chatId, `Invalid username or password`);
            }
        });

        conversation.setActiveNode('main');
    }
}

export {
    LoginCommand,
}

