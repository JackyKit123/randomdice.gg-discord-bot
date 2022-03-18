import { Message, PartialMessage } from 'discord.js';
import { snipeListener } from 'community discord/snipe';
import { logError } from 'util/logMessage';
import { isCommunityDiscord } from 'config/guild';

export default async function messageDelete(
    message: Message | PartialMessage
): Promise<void> {
    const { guild, client } = message;
    try {
        if (isCommunityDiscord(guild)) {
            await snipeListener('delete', message);
        }
    } catch (err) {
        await logError(client, err, 'client#messageDelete', message);
    }
}
