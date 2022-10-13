import moment from "moment";
import { Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { requireSelectedWallet } from '@app/command/middleware/requireSelectedWallet';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';
import { bot } from '@app/main';

class GenerateChartCommand implements Command {
    readonly name: string = 'add';
    readonly description: string = 'Add a variation to the selected wallet';

    @requireLogin()
    async run(message: Message): Promise<void> {
        /*TODO
        const chatId = message.chat.id;

        const user = await getUserFromChatId(chatId);
    
        // TODO (VERY IMPORTANT): RATE LIMIT THE NUMBER OF CHARTS THAT CAN BE GENERATED
    
        // /chart [period=month] [wallet-regex]
    
        let period = 'month';
        if (parsedArgs.length >= 1) {
            period = parsedArgs[0];
        }
    
        let variations = [];
        if (parsedArgs.length >= 2) {
            const regex = parsedArgs.slice(1).join(' ');
            variations = await user.getVariations(period, regex);
        } else {
            const wallet = await user.getSelectedWallet();
            if (wallet === null) {
                await bot.sendMessage(`No wallet specified. Either /select a wallet or specify it as an argument`);
                return;
            }
            variations = await wallet.getVariations(period);
        }
    
        // Yup, we're iterating them, like in the good ol' days :)
        let sum = 0;
        for (let variation of variations) {
            variation.incrementalAmount = sum;
            sum += variation.amount;
        }
    
        const configuration = {
            type: "line",
            data: {
                datasets: [
                    {
                        data: variations.map(variation => {
                            return {
                                x: variation.timestamp,
                                y: variation.incrementalAmount,
                            };
                        }),
                        fill: false,
                        borderColor: 'red',
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    xAxis: {
                        type: 'time', 
                    },
                },
            },
        };
    
        const imageBuffer = await chartJsRenderer.renderToBuffer(configuration); // TODO USE STREAMS ?
        
        await bot.sendPhoto(
            chatId,
            imageBuffer,
            { caption: `Here's your chart \u{1F642}` },
            { filename: 'chart.png', contentType: 'image/png' }
        );*/
    }
}

export {
    GenerateChartCommand,
}
