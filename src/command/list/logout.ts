
import { Message } from 'node-telegram-bot-api'
import { bot } from '@app/main';
import db from '@app/db';
import { Command } from '@app/command';

class LogoutCommand implements Command {
    readonly name: string = 'logout';
    readonly description: string = 'Logout';

    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;

        const result = await db.run(`DELETE FROM sessions WHERE id_chat=?`, chatId);
        if (result.changes > 0) {
            await bot.sendMessage(chatId, `Successfully logged out`);
        } else {
            await bot.sendMessage(chatId, `Already logged out`);
        }
    }
}

export {
    LogoutCommand,
}
