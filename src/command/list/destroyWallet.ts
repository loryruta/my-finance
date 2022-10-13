import { CallbackQuery, Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { bot } from '@app/main';
import { Conversation } from '@app/conversation';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';

class DestroyWalletCommand implements Command {
    readonly name: string = 'destroy';
    readonly description: string = 'Destroy a wallet';

    @requireLogin()
    @requireSelectedWallet()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);
        const wallet = await user.getSelectedWallet();
    
        new Conversation(bot, chatId)
            .run(async () =>
                await bot.sendMessage(chatId, `Are you sure you want to __*permanently destroy*__ the wallet "${await wallet.getAttribute("title")}"?`, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Yes", callback_data: 'destroy_wallet.y' }],
                            [{ text: "No", callback_data: 'destroy_wallet.n' }]
                        ]
                    }
                })
            )
            .onCallbackQuery(async (conversation: Conversation, query: CallbackQuery) => {
                let [queryName, queryValue] = query.data.split('.');
                if (queryName === 'destroy_wallet') {
                    if (queryValue !== 'y') {
                        conversation.end();
                    }
                    return true;
                }
                return false;
            })
            .run (async () =>
                await bot.sendMessage(chatId, `Wallet ${wallet.getAttribute("title")} destroyed forever`)
            );
    }
}

export {
    DestroyWalletCommand,
}
