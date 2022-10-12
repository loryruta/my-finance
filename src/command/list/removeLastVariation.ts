import moment from "moment";
import { Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';
import { bot } from '@app/main';

class RemoveLastVariationCommand implements Command {
    readonly name: 'add';
    readonly description: 'Add a variation to the selected wallet';

    @requireLogin()
    @requireSelectedWallet()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;

        const user = await getUserFromChatId(chatId);
        const wallet = await user.getSelectedWallet();
        
        let removedVariation = await wallet.removeLastVariation();
        if (removedVariation) {
            await bot.sendMessage(chatId, `Removed variation #${removedVariation.id} of ${removedVariation.amount} dated ${moment(removedVariation.timestamp).format('lll')}`);
        } else {
            await bot.sendMessage(chatId, "No variation found: wallet is empty");
        }
    }
}

export {
    RemoveLastVariationCommand,
}
