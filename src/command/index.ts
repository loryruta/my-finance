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
        this.commands = this.commands.concat([
            new AddVariationCommand(),
            new CreateWalletCommand(),
            new DestroyWalletCommand(),
            new GenerateChartCommand(),
            new LoginCommand(),
            new LogoutCommand(),
            new RemoveLastVariationCommand(),
            new SelectWalletCommand(),
        ]);
    }

    handle() {
        this.bot.setMyCommands(this.commands.map(command => {
            return {
                command: command.name,
                description: command.description,
            }
        }));

        this.bot.onText(/\/([^\s]+).*/, (message: Message, match: RegExpExecArray) => {
            const who = message.chat.username;

            console.log(`${who} issued "${match[1]}"`);

            let found = this.commands.filter(command => {
                return command.name === match[1];
            });
            if (found.length > 0) {
                found[0].run(message)
                    .catch(error => console.error(`Command execution error`, error));
            } else {
                console.log(`Command unrecognized`);
            }
        });
    }
}

export {
    Command,
    CommandHandler
}
