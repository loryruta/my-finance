import { Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { bot } from '@app/main';
import { Conversation, createConversation } from '@app/conversation';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';

class CreateWalletCommand implements Command {
    readonly name: string = 'create';
    readonly description: string = 'Create a wallet';

    @requireLogin()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);
        
        if ((await user.getWalletCount()) >= 5) {
            bot.sendMessage(chatId, `You reached your max number of wallets`);
            return;
        }

        const conversation = createConversation(bot, chatId);

        conversation.createRunNode('main', async () => {
            await bot.sendMessage(chatId, `Insert wallet's title`);
            conversation.setActiveNode('insert_title');
        });

        conversation.createOnMessageNode('insert_title', async (message: Message) => {
            const title = message.text;
    
            if (title.length >= 256) {
                bot.sendMessage(chatId, `Title must be at most 256 characters. Think of another title \u{1F914}`);
                return;
            }

            await user.createWallet(title);
            await bot.sendMessage(chatId, `Wallet created successfully`);

            conversation.dispose();
        });

        conversation.setActiveNode('main');
    }
}

export {
    CreateWalletCommand,
}

