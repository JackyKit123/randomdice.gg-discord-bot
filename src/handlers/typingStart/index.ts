import { afkActivityListener } from 'community discord/afk';
import { logError } from 'util/logMessage';
import { Typing } from 'discord.js';
import { isProd } from 'config/env';

export default async function typingStart(typing: Typing): Promise<void> {
    const { user, client } = typing;
    try {
        if (!user.bot && isProd) {
            await afkActivityListener(typing);
        }
    } catch (err) {
        await logError(client, err, 'client#typingStart', typing);
    }
}
