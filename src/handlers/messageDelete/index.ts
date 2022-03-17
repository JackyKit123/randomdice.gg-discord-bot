import { Message, PartialMessage } from 'discord.js';
import { snipeListener } from 'community discord/snipe';
import logMessage from 'util/logMessage';
import { isCommunityDiscord } from 'config/guild';

export default async function messageDelete(
    message: Message | PartialMessage
): Promise<void> {
    const { guild, author, client } = message;
    try {
        if (isCommunityDiscord(guild)) {
            await snipeListener('delete', message);
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when listening to message deletion. ${
                // eslint-disable-next-line no-nested-ternary
                guild
                    ? `in server ${guild.name}`
                    : author
                    ? `in DM with <@${author.id}>`
                    : ''
            } : ${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
