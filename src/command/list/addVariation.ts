import { Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';

class AddVariationCommand implements Command {
    readonly name: string = 'add';
    readonly description: string = 'Add a variation to the selected wallet';

    @requireLogin()
    @requireSelectedWallet()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);
        const wallet = await user.getSelectedWallet();
        
        console.log("Add variation");
    }
}

export {
    AddVariationCommand,
}
