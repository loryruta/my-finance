import { Message } from 'node-telegram-bot-api'
import bcrypt from 'bcrypt';
import moment from 'moment';
import { bot } from '@app/main';
import db from '@app/db';
import { Conversation, createConversation } from '@app/conversation';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';

class LoginCommand implements Command {
    readonly name: 'login';
    readonly description: 'Login the user';

    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;

        if ((await getUserFromChatId(chatId)) !== null) {
            await bot.sendMessage(chatId, `You're already logged in. Use /logout`);
            return;
        }
    
        createConversation(bot, chatId)
            .run(async _ =>
                await bot.sendMessage(chatId, `Insert your username`))
            .onMessage(async (conversation: Conversation, message: Message) => {
                conversation.userData.username = message.text;
                return true;
            })
            .run(async _ =>
                await bot.sendMessage(chatId, `Insert your password`))
            .onMessage(async (conversation, message) => {
                const chatId = conversation.chatId;
    
                conversation.userData.password = message.text;
        
                // Delete the password message soon after reading to enhance security
                await bot.deleteMessage(chatId, message.message_id.toString());
                
                return true;
            })
            .run(async conversation => {
                const chatId = conversation.chatId;
                const {
                    username,
                    password,
                } = conversation.userData;
            
                let failed = true;
            
                let rows = await db.all(`SELECT * FROM users WHERE "user"=?`, [username]);
                if (rows.length > 0) {
                    const row = rows[0];
                    const userId = row['id'];
                    const storedPasswordDigest = row['password_digest'];
                    const matched = await bcrypt.compare(password, storedPasswordDigest);
                    if (matched) {
                        const sessionValidUntil = moment().add(1, 'week');
                        
                        await db.run(`BEGIN`);
                        await db.run(`DELETE FROM sessions WHERE id_user=?`, [userId]);
                        await db.run(`INSERT INTO sessions (id_chat, id_user, valid_until) VALUES (?, ?, ?)`, [chatId, userId, sessionValidUntil]);
                        await db.run(`COMMIT`);
            
                        bot.sendMessage(chatId, `Logged in successfully`);
                        failed = false;
                    }
                }
            
                if (failed) {
                    bot.sendMessage(chatId, `Invalid username or password`);
                }
            })
            .start();
    }
}

export {
    LoginCommand,
}

