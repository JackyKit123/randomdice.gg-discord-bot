import { snipeListener } from 'community discord/snipe';
import { logError } from 'util/logMessage';
import { Message, PartialMessage } from 'discord.js';
import { isCommunityDiscord } from 'config/guild';

export default async function messageUpdate(
    message: Message | PartialMessage
): Promise<void> {
    const { guild, client } = message;
    try {
        if (isCommunityDiscord(guild)) {
            await snipeListener('edit', message);
        }
    } catch (err) {
        await logError(client, err, 'client#messageUpdate', message);
    }
}
