import logMessage from 'util/logMessage';
import { GuildBan } from 'discord.js';
import { writeModLogOnGenericUnban } from 'community discord/moderation/modlog';
import { isCommunityDiscord } from 'config/guild';
import { isProd } from 'config/env';

export default async function guildBanRemove(ban: GuildBan): Promise<void> {
    const { guild, client } = ban;

    try {
        if (isCommunityDiscord(guild) && isProd) {
            await writeModLogOnGenericUnban(ban);
        }
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
