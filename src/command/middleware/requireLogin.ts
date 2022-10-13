import { Message } from 'node-telegram-bot-api';
import { bot } from '@app/main';
import { getUserFromChatId } from '@app/auth';

function requireLogin() {
    return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
        const value = descriptor.value;
        
        descriptor.value = async function (message: Message) {
            const chatId = message.chat.id;

            if ((await getUserFromChatId(chatId)) === null) {
                bot.sendMessage(chatId, `You're not logged in. Use /login`);
                return;
            }

            await value.apply(this, [message]);
        };
    };
}

export {
    requireLogin,
}
