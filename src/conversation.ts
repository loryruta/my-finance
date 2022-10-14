import TelegramBot from 'node-telegram-bot-api';
import { Message, CallbackQuery } from 'node-telegram-bot-api';

interface Node {
    run();
    dispose();
}

class Conversation {
    readonly bot: TelegramBot;
    readonly chatId: number;
    
    private activeNode: Node;
    private readonly nodes: Map<string, Node>;

    userData: any;

    constructor(bot: TelegramBot, chatId: number) { // Shouldn't be called by externals (use createConversation instead)
        this.bot = bot;
        this.chatId = chatId;
        
        this.activeNode = null;
        this.nodes = new Map<string, Node>();

        this.userData = {};
    }

    createRunNode(name: string, callback: () => Promise<void>): Node {
        const node = {
            run: () => {
                callback()
                    .catch(console.error)
            },
            dispose: () => {},
        };
        this.nodes.set(name, node);
        return node;
    }

    createOnMessageNode(name: string, callback: (message: Message) => Promise<void>): Node {
        const handler = (message: Message) => {
            if (message.chat.id === this.chatId) {
                callback(message)
                    .catch(console.error);
            }
        };
        const node = {
            run: () => this.bot.on('message', handler),
            dispose: () => this.bot.removeListener('message', handler),
        };
        this.nodes.set(name, node);
        return node;
    }

    protected createOnCallbackQueryNode(name: string, callback: (query: CallbackQuery) => Promise<void>): Node {
        const handler = (query: CallbackQuery) => {
            if (query.message!.chat.id === this.chatId) {
                callback(query)
                    .catch(console.error);
            }
        };
        const node = {
            run: () => this.bot.on('callback_query', handler),
            dispose: () => this.bot.removeListener('callback_query', handler),
        };
        this.nodes.set(name, node);
        return node;
    }

    createOnNamedCallbackQueryNode(name: string, callback: (query: CallbackQuery, answer: string) => Promise<void>): Node {
        return this.createOnCallbackQueryNode(name, async (query: CallbackQuery) => {
            let [queryName, answer] = query.data.split('.');
            if (queryName === name) {
                await callback(query, answer);
                this.bot.answerCallbackQuery(query.id);
            }
        });
    }

    setActiveNode(name: string) {
        const node = this.nodes.get(name);
        if (!node) {
            throw `Node "${name}" not found`;
        }
        if (this.activeNode) {
            this.activeNode.dispose();
        }
        this.activeNode = node;
        node.run();
    }

    dispose(): void {
        if (this.activeNode) {
            this.activeNode.dispose();
            this.activeNode = null;
        }
    }
}

const conversations = new Map<number, Conversation>;

function disposeConversation(chatId: number): void {
    const oldConversation = conversations.get(chatId);
    if (oldConversation != null) {
        oldConversation.dispose();
    }
}

function createConversation(bot: TelegramBot, chatId: number): Conversation {
    disposeConversation(chatId);

    const conversation = new Conversation(bot, chatId);
    conversations.set(chatId, conversation);
    return conversation;
}

export {
    Conversation,
    createConversation,
    disposeConversation,
}

// TODO end conversations after some amount of time being open
