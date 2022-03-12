import { removeAfkListener } from 'community discord/afk';
import logMessage from 'util/logMessage';
import { Typing } from 'discord.js';

export default async function typingStart(typing: Typing): Promise<void> {
    const { user, channel, client } = typing;
    try {
        if (!user.bot && process.env.NODE_ENV === 'production') {
            removeAfkListener(channel, user);
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when listening to typing start event ${
                (err as Error).stack ?? (err as Error).message ?? err
            }.`
        );
    }
}
