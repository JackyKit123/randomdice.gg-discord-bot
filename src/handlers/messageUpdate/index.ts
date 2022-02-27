import { snipeListener } from 'community discord/snipe';
import logMessage from 'dev-commands/logMessage';
import { Message, PartialMessage } from 'discord.js';

export default async function messageUpdate(
    message: Message | PartialMessage
): Promise<void> {
    const { guild, author, client } = message;
    try {
        if (process.env.COMMUNITY_SERVER_ID === guild?.id) {
            await snipeListener('edit', message);
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong ${
                    // eslint-disable-next-line no-nested-ternary
                    guild
                        ? `in server ${guild.name}`
                        : author
                        ? `in DM with <@${author.id}>`
                        : ''
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\n when listening to message edition.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
}
