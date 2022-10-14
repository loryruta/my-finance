import { CallbackQuery, Message } from 'node-telegram-bot-api'
import { requireLogin } from '@app/command/middleware/requireLogin';
import { getUserFromChatId } from '@app/auth';
import { Command } from '@app/command';
import { bot, chartJsRenderer } from '@app/main';
import { createConversation } from "@app/conversation";
import { emojify } from 'node-emoji';

class GenerateChartCommand implements Command {
    readonly name: string = 'chart';
    readonly description: string = 'Generate a temporal chart';

    @requireLogin()
    async run(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const user = await getUserFromChatId(chatId);
        const wallets = await user.getWallets();

        const conversation = createConversation(bot, chatId);

        const selectedWalletIds = [];
        let temporalWindow;

        conversation.createRunNode('ask_wallet', async () => {
            const selectableWallets = wallets
                .filter(wallet => !selectedWalletIds.includes(wallet.id));

            if (selectableWallets.length > 0) {
                await bot.sendMessage(chatId, `Select the wallets you want to generate the chart for`, {
                    reply_markup: {
                        inline_keyboard: [
                            ...await Promise.all(selectableWallets
                                .map(async wallet => {
                                    return [{
                                        text: await wallet.getAttribute('title'),
                                        callback_data: `answer_wallet.${wallet.id}`
                                    }]
                                })),
                            // TODO (FUTURE FEATURE) [ { text: emojify(':arrow_left:') }, { text: emojify(':arrow_right:') } ],
                            [{
                                text: emojify('Done :white_check_mark:'),
                                callback_data: `answer_wallet.done`
                            }]
                        ]
                    }
                });
                conversation.setActiveNode('answer_wallet');
            } else {
                conversation.setActiveNode('ask_temporal_window');
            }
        });

        conversation.createOnNamedCallbackQueryNode('answer_wallet', async (callbackQuery: CallbackQuery, answer: string) => {
            if (answer === 'done') {
                conversation.setActiveNode('ask_temporal_window');
            } else {
                const walletId = parseInt(answer);
                selectedWalletIds.push(walletId);

                console.log(`Selected wallets: ${selectedWalletIds}`);

                conversation.setActiveNode('ask_wallet');
            }
        });

        conversation.createRunNode('ask_temporal_window', async () => {
            const temporalWindows = [
                { name: 'Day', value: 'day' },
                { name: 'Month', value: 'month' },
                { name: 'Year', value: 'year' },
            ];
            await bot.sendMessage(chatId, `Select the temporal window`, {
                reply_markup: {
                    inline_keyboard: [temporalWindows.map(temporalWindow => {
                        return {
                            text: temporalWindow.name,
                            callback_data: `answer_temporal_window.${temporalWindow.value}`
                        };
                    })]
                }
            });
            conversation.setActiveNode('answer_temporal_window');
        });
        
        conversation.createOnNamedCallbackQueryNode('answer_temporal_window', async (callbackQuery: CallbackQuery, answer: string) => {
            temporalWindow = answer;
            conversation.setActiveNode('generate_chart');
        });

        conversation.createRunNode('generate_chart', async () => {
            let variations = [];
            for (const walletId of selectedWalletIds) {
                const wallet = await user.getWallet(walletId);
                variations = variations.concat(
                    await wallet.getVariations(temporalWindow)
                );
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
        
            const imageBuffer = await chartJsRenderer.renderToBuffer(configuration as any); // TODO USE STREAMS ?
            
            await bot.sendPhoto(
                chatId,
                imageBuffer,
                { caption: emojify(`Here's your chart :slightly_smiling_face:`) },
                { filename: 'chart.png', contentType: 'image/png' }
            );

            conversation.dispose();
        });

        conversation.setActiveNode('ask_wallet');
    }
}

export {
    GenerateChartCommand,
}
