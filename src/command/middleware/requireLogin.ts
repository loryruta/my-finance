import { Message } from 'node-telegram-bot-api';
import { bot } from '@app/main';
import { getUserFromChatId } from '@app/auth';

function requireLogin() {
    return (target: any, memberName: string, propertyDecorator: PropertyDescriptor) => {
        propertyDecorator.get = () => {
            return async (message: Message) => {
                const chatId = message.chat.id;
                
                if ((await getUserFromChatId(chatId)) === null) {
                    bot.sendMessage(chatId, "You're not logged in. Use /login");
                    return;
                }
    
                await propertyDecorator.value.apply(this, message);
            };
        };
        return propertyDecorator;
    };
}

export {
    requireLogin,
}
