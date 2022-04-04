import banOnLeave from 'community discord/moderation/ban appeal/banOnLeave';
import { deleteCustomRoleOnGuildLeave } from 'community discord/customRole';
import { logError } from 'util/logMessage';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { writeModLogOnGenericKick } from 'community discord/moderation/modlog';
import { banAppealDiscordId, communityDiscordId } from 'config/guild';
import { isProd } from 'config/env';
import { welcomeRewardSpamProtection } from 'community discord/currency/welcomeReward';

export default async function guildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild, client } = member;

    try {
        if (isProd) {
            switch (guild.id) {
                case communityDiscordId:
                    await Promise.all([
                        deleteCustomRoleOnGuildLeave(member),
                        writeModLogOnGenericKick(member),
                        welcomeRewardSpamProtection(member),
                    ]);
                    break;
                case banAppealDiscordId:
                    await banOnLeave(member);
                    break;
                default:
            }
        }
    } catch (err) {
        await logError(client, err, 'client#guildMemberRemove', member);
    }
}
