import db from '@app/db';
import { User } from '@app/model/user';

async function getUserIdFromChatId(chatId): Promise<number | undefined> {
    let rows = await db.all(`SELECT * FROM sessions WHERE id_chat=?`, [chatId]);
    if (rows.length === 0 /* TODO || expired session */) {
        return undefined;
    } else {
        return rows[0]['id_user'];
    }
}

async function getUserFromChatId(chatId: number): Promise<User | undefined> {
    const userId = await getUserIdFromChatId(chatId);
    return userId != null ? new User(userId) : undefined;
}

export {
    getUserIdFromChatId,
    getUserFromChatId,
}
