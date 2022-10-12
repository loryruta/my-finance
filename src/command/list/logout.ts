
import { Message } from 'node-telegram-bot-api'
import { bot } from '@app/main';
import db from '@app/db';
import { requireLogin } from '@app/command/middleware/requireLogin';
import { Command } from '@app/command';

class LogoutCommand implements Command {
    readonly name: 'logout';
    readonly description: 'Logout';

    @requireLogin()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;

        await db.run(`DELETE FROM sessions WHERE id_chat=?`, [chatId]);
    
        await bot.sendMessage(chatId, `Successfully logged out`);
    }
}

export {
    LogoutCommand,
}
