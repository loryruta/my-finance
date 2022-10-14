import { CallbackQuery, Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';
import { Conversation, createConversation } from '@app/conversation';
import { bot } from '@app/main';
import { emojify } from 'node-emoji'

class AddVariationCommand implements Command {
    readonly name: string = 'add';
    readonly description: string = 'Add a variation to the selected wallet';

    @requireLogin()
    @requireSelectedWallet()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);
        const selectedWallet = await user.getSelectedWallet();

        if (!selectedWallet) {
            await bot.sendMessage(chatId, `You've not selected any wallet. Use /select`);
            return;
        }

        const conversation = createConversation(bot, chatId);
        
        conversation.createRunNode('main', async () => {
            await bot.sendMessage(chatId, `Insert the amount of the variation`);
            conversation.setActiveNode('answer_amount');
        });

        conversation.createOnMessageNode('answer_amount', async (message: Message) => {
            let amount = parseFloat(message.text);
            if (isNaN(amount)) {
                await bot.sendMessage(chatId, `Not a decimal number (remember it must be dot-separated). Try again`);
                return;
            }
            conversation.userData.amount = amount;
            conversation.setActiveNode('editor');
        });

        conversation.createRunNode('editor', async () => {
            let description = `Adding a variation of ${conversation.userData.amount}`;
            if (!!conversation.userData.note) {
                description += `, described as "${conversation.userData.note}"`;
            } else if (!!conversation.userData.date) {
                description += `, happened at ${conversation.userData.date}`;
            }
            await bot.sendMessage(chatId, `${description}. Want to make additional changes?`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: emojify("Add a note :spiral_note_pad:"), callback_data: "editor_input.note" },
                            { text: emojify("Set date :clock3:"), callback_data: "editor_input.set_date" },
                        ],
                        [ { text: emojify("Confirm :white_check_mark:"), callback_data: "editor_input.confirm" } ],
                        [ { text: emojify("Cancel :x:"), callback_data: "editor_input.cancel" } ],
                    ]
                }
            });
            conversation.setActiveNode('editor_input');
        });

        conversation.createOnMessageNode('insert_note', async (message: Message) => {
            conversation.userData.note = message.text;
            conversation.setActiveNode('editor');
        });

        conversation.createOnMessageNode('insert_date', async (message: Message) => {
            conversation.userData.date = message.text; // TODO validate date
            conversation.setActiveNode('editor');
        });

        conversation.createOnNamedCallbackQueryNode('editor_input', async (callbackQuery: CallbackQuery, answer: string) => {
            const chatId = conversation.chatId;
            if (answer === 'confirm') {
                conversation.setActiveNode('confirm');
            } else if (answer === 'cancel') {
                await bot.sendMessage(chatId, `Variation not added`);
                conversation.dispose();
            } else if (answer === 'note') {
                await bot.sendMessage(chatId, `Insert a note describing this variation`);
                conversation.setActiveNode('insert_note');
            } else if (answer === 'set_date') {
                await bot.sendMessage(chatId, `Insert the date when this variation happened`);
                conversation.setActiveNode('insert_date');
            }
        });

        conversation.createRunNode('confirm', async () => {
            let {
                amount,
                note,
                date,
            } = conversation.userData;
            await selectedWallet.addVariation(amount, note, date);

            await bot.sendMessage(chatId, `Variation added`);

            conversation.dispose();
        });

        conversation.setActiveNode('main');
    }
}

export {
    AddVariationCommand,
}
