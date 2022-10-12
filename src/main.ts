import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import 'chartjs-adapter-moment'
import { CommandHandler } from './command';

// Load app.json
if (!fs.existsSync("./configs/app.json")) {
    console.error(`Required config file "./configs/app.json" not found`);
    process.exit(1);
}

const config: any = fs.readFileSync('./configs/app.json').toJSON(); // TODO Typescript type for Config

// Telegram bot
console.log(`Initializing Telegram bot...`);

const bot = new TelegramBot(config.telegram.token, { polling: true });

console.log(`Telegram bot initialized`);

// Chart.js renderer
console.log(`Initializing chart.js renderer...`);

require('chartjs-adapter-moment');

const chartJsRenderer = new ChartJSNodeCanvas({  type: 'png' as any /* Workaround */, width: 720, height: 512 });

console.log(`Chart.js renderer initialized`);

if (require.main === module) {
    const commandHandler = new CommandHandler(bot);
    commandHandler.handle();
}

export {
    config,
    bot,
    chartJsRenderer,
}
