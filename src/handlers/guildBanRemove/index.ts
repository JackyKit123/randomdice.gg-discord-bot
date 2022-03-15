import logMessage from 'util/logMessage';
import { GuildBan } from 'discord.js';
import { writeModLogOnGenericUnban } from 'community discord/moderation/modlog';

export default async function guildBanRemove(ban: GuildBan): Promise<void> {
    const { guild, client } = ban;

    let asyncPromisesCapturer: Promise<unknown>[] = [];

    if (
        process.env.COMMUNITY_SERVER_ID === guild.id &&
        process.env.NODE_ENV === 'production'
    ) {
        asyncPromisesCapturer = [writeModLogOnGenericUnban(ban)];
    }

    try {
        await Promise.all(asyncPromisesCapturer);
    } catch (error) {
        await logMessage(
            client,
            'warning',
            `Oops! Something went wrong when handling \`guildBanRemove\`\n${
                (error as Error).stack ?? (error as Error).message ?? error
            }`
        );
    }
}
