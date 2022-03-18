import { logError } from 'util/logMessage';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { writeModLogOnGenericMute } from 'community discord/moderation/modlog';
import { isCommunityDiscord } from 'config/guild';
import { isProd } from 'config/env';

export default async function guildMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild, client } = newMember;

    try {
        if (isCommunityDiscord(guild) && isProd) {
            await writeModLogOnGenericMute(oldMember, newMember);
        }
    } catch (error) {
        await logError(client, error, 'client#guildMemberUpdate', newMember);
    }
}
