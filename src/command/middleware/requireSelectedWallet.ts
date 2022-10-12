import { Message } from 'node-telegram-bot-api';
import { bot } from '@app/main';
import { getUserFromChatId } from '@app/auth';

function requireSelectedWallet() {
    return (target: any, memberName: string, propertyDecorator: PropertyDescriptor) => {
        propertyDecorator.get = () => {
            return async (message: Message) => {
                const chatId = message.chat.id;
                const user = await getUserFromChatId(chatId);
        
                if ((await user.getSelectedWallet()) === null) {
                    bot.sendMessage(chatId, "You've not selected any wallet. Use /select");
                    return;
                }

                await propertyDecorator.value.apply(this, message);
            }
        }
    };
}

export {
    requireSelectedWallet,
}
