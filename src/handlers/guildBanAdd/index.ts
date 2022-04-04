import banMessage from 'community discord/moderation/banMessage';
import { logError } from 'util/logMessage';
import { GuildBan } from 'discord.js';
import { writeModLogOnGenericBan } from 'community discord/moderation/modlog';
import { communityDiscordId } from 'config/guild';
import { isProd } from 'config/env';
import { broadcastBanLogOnBan } from 'community discord/moderation/hack ban log sharing/broadcast';

export default async function guildBanAdd(ban: GuildBan): Promise<void> {
    const { guild, client } = ban;

    try {
        if (isProd) {
            switch (guild.id) {
                case communityDiscordId:
                    await Promise.all([
                        banMessage(ban),
                        writeModLogOnGenericBan(ban),
                    ]);
                // fallthrough
                default:
                    await broadcastBanLogOnBan(ban);
            }
        }
    } catch (error) {
        await logError(client, error, 'client#guildBanAdd', ban);
    }
}
