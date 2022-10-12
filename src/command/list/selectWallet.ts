import { CallbackQuery, Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { bot } from '@app/main';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';
import { Conversation, createConversation } from '@app/conversation';
import { Wallet } from '@app/model/wallet';

class SelectWalletCommand implements Command {
    readonly name: 'select';
    readonly description: 'Select a wallet';

    @requireLogin()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
    
        const user = await getUserFromChatId(chatId);
        const wallets = await user.getWallets();
    
        if (wallets.length == 0) {
            await bot.sendMessage(chatId, `You don't have any wallet. Use /create`);
            return;
        }
    
        createConversation(bot, chatId)
            .run(async (conversation: Conversation) => {
                await bot.sendMessage(chatId, "Select a wallet", {
                    reply_markup: {
                        inline_keyboard: [
                            await Promise.all(wallets.map(async wallet => {
                                return {
                                    text: await wallet.getAttribute('title'),
                                    callback_data: `select_wallet.${wallet.id}`,
                                }
                            }))
                        ]
                    }
                });
            })
            .onNamedCallbackQuery('select_wallet', async (conversation: Conversation, query: CallbackQuery, answer: string) => {
                const selectedWalletId = (answer as unknown) as number;
                const selectedWallet = new Wallet(selectedWalletId);
                
                const user = await getUserFromChatId(chatId);
                user.setAttribute("id_selected_wallet", selectedWalletId);
            
                const message = await bot.sendMessage(chatId, `Selected wallet "${await selectedWallet.getAttribute("title")}"`);
                await bot.unpinAllChatMessages(chatId);
                await bot.pinChatMessage(chatId, message.message_id);
            
                return true;
            });
    }
}

export {
    SelectWalletCommand,
}
