import { CallbackQuery, Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { bot } from '@app/main';
import { Conversation, createConversation } from '@app/conversation';
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
        const walletTitle = await wallet.getAttribute('title');

        const conversation = createConversation(bot, chatId);

        conversation.createRunNode('main', async () => {
            await bot.sendMessage(chatId, `Are you sure you want to __*permanently destroy*__ the wallet "${walletTitle}"?`, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Yes", callback_data: 'destroy_wallet.y' }],
                        [{ text: "No", callback_data: 'destroy_wallet.n' }]
                    ]
                }
            });
            conversation.setActiveNode('destroy_wallet');
        });

        conversation.createOnNamedCallbackQueryNode('destroy_wallet', async (query: CallbackQuery, answer: string) => {
            await bot.deleteMessage(query.message.chat.id, query.message.message_id.toString());
            if (answer !== 'y') {
                conversation.dispose();
                return;
            }

            await user.destroyWallet(wallet.id);
            await bot.sendMessage(chatId, `Wallet "${walletTitle}" destroyed forever`);
            await bot.unpinChatMessage(chatId);
        });

        conversation.setActiveNode('main');
    }
}

export {
    DestroyWalletCommand,
}
