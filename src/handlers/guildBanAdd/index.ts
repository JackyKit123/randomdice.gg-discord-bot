import banMessage from 'community discord/moderation/banMessage';
import { logError } from 'util/logMessage';
import { GuildBan } from 'discord.js';
import { writeModLogOnGenericBan } from 'community discord/moderation/modlog';
import { isCommunityDiscord } from 'config/guild';
import { isProd } from 'config/env';

export default async function guildBanAdd(ban: GuildBan): Promise<void> {
    const { guild, client } = ban;

    try {
        if (isCommunityDiscord(guild) && isProd) {
            await Promise.all([banMessage(ban), writeModLogOnGenericBan(ban)]);
        }
    } catch (error) {
        await logError(client, error, 'client#guildBanAdd', ban);
    }
}
