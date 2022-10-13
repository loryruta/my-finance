import config from '@app/config';

// Telegram bot
import TelegramBot from 'node-telegram-bot-api';

console.log(`Initializing Telegram bot...`);

const bot = new TelegramBot(config().telegram.token, { polling: true });

console.log(`Telegram bot initialized`);

// Chart.js renderer
console.log(`Initializing chart.js renderer...`);

import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import 'chartjs-adapter-moment'

const chartJsRenderer = new ChartJSNodeCanvas({  type: 'png' as any /* Workaround */, width: 720, height: 512 });

console.log(`Chart.js renderer initialized`);

import { CommandHandler } from './command';

export {
    bot,
    chartJsRenderer,
}

if (require.main === module) {
    console.log(`Listening...`);

    const commandHandler = new CommandHandler(bot);
    commandHandler.handle();
}
