import TelegramBot from 'node-telegram-bot-api';
import { Message, CallbackQuery } from 'node-telegram-bot-api';

interface Stage {
    run();
    dispose();
}

class Conversation {
    readonly bot: TelegramBot;
    readonly chatId: number;
    
    private chain: Stage[];
    
    userData: any;

    constructor(bot: TelegramBot, chatId: number) { // Shouldn't be called by externals (use createConversation instead)
        this.bot = bot;
        this.chatId = chatId;
        this.chain = [];
        
        this.userData = {};
    }

    protected next() {
        const lastStage = this.chain.shift();
        lastStage.dispose();
        this.start();
    }

    onMessage(callback: (conversation: this, message: Message) => Promise<boolean>): this {
        const handler = async (message: Message) => {
            if (message.chat.id === this.chatId && (await callback(this, message))) {
                this.next();
            }
        };
        this.chain.push({
            run: () => this.bot.on('message', handler),
            dispose: () => this.bot.removeListener('message', handler),
        });
        return this;
    }

    onCallbackQuery(callback: (conversation: this, query: CallbackQuery) => Promise<boolean>): this {
        const handler = async (query: CallbackQuery) => {
            if (query.message!.chat.id === this.chatId && (await callback(this, query))) {
                this.bot.answerCallbackQuery(query.id);
                this.next();
            }
        };
        this.chain.push({
            run: () => this.bot.on('callback_query', handler),
            dispose: () => this.bot.removeListener('callback_query', handler),
        });
        return this;
    }

    /**
     * Expect the query string to be in the format `<queryName>.<answer>` and pass the `answer` argument to the given `callback`
     */
    onNamedCallbackQuery(name: string, callback: (conversation: this, query: CallbackQuery, answer: string) => Promise<boolean>): this {
        return this.onCallbackQuery(async (conversation: this, query: CallbackQuery) => {
            let [queryName, answer] = query.data.split('.');
            if (queryName === name && (await callback(this, query, answer))) {
                return true;
            }
            return false;
        });
    }

    run<TCallbackReturn>(callback: (conversation: this) => Promise<TCallbackReturn>): this {
        this.chain.push({
            run: () => {
                callback(this);
                this.next();
            },
            dispose: () => {},
        });
        return this;
    }

    start(): void {
        if (this.chain.length > 0) {
            this.chain[0].run();
        }
    }

    end(): void {
        if (this.chain.length > 0) {
            this.chain[0].dispose();
            this.chain = [];
        }
    }
}

const conversations = new Map<number, Conversation>;

function createConversation(bot: TelegramBot, chatId: number): Conversation {
    const oldConversation = conversations.get(chatId);
    if (oldConversation != null) {
        oldConversation.end();
    }
    
    let conversation = new Conversation(bot, chatId);
    conversations.set(chatId, conversation);
    return conversation;
}

export {
    Conversation,
    createConversation,
}

// TODO end conversations after some amount of time being open
