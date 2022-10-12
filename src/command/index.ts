import { Message } from "node-telegram-bot-api";
import TelegramBot from 'node-telegram-bot-api';
import { AddVariationCommand } from "./list/addVariation";
import { CreateWalletCommand } from "./list/createWallet";
import { DestroyWalletCommand } from "./list/destroyWallet";
import { GenerateChartCommand } from "./list/generateChart";
import { LoginCommand } from "./list/login";
import { LogoutCommand } from "./list/logout";
import { RemoveLastVariationCommand } from "./list/removeLastVariation";
import { SelectWalletCommand } from "./list/selectWallet";

interface Command {
    name: string;
    description: string;

    run(message: Message): Promise<void>;
}

class CommandHandler {
    readonly bot: TelegramBot;

    commands: Command[];

    constructor(bot: TelegramBot) {
        this.bot = bot;

        this.commands = [];

        this.registerBuiltinCommands();
    }

    protected registerBuiltinCommands() {
        this.commands.concat([
            new AddVariationCommand,
            new CreateWalletCommand,
            new DestroyWalletCommand,
            new GenerateChartCommand,
            new LoginCommand,
            new LogoutCommand,
            new RemoveLastVariationCommand,
            new SelectWalletCommand,
        ]);
    }

    handle() {
        this.bot.setMyCommands(this.commands.map(command => {
            return {
                command: command.name,
                description: command.description,
            }
        }));

        this.bot.onText(/\/(.+)/, (message: Message, match: RegExpExecArray) => {
            let found = this.commands.filter(command => command.name === match[1]);
            if (found.length > 0) {
                found[0].run(message)
                    .then(console.error);
            }
        });
    }
}

export {
    Command,
    CommandHandler
}
