import createAppealChanel from 'community discord/moderation/ban appeal/createAppealChannel';
import welcomeReward from 'community discord/currency/welcomeReward';
import { logError } from 'util/logMessage';
import { GuildMember } from 'discord.js';
import { banAppealDiscordId, communityDiscordId } from 'config/guild';
import { isProd } from 'config/env';
import { warnOnBannedMemberJoin } from 'community discord/moderation/hack ban log sharing';

export default async function guildMemberAdd(
    member: GuildMember
): Promise<void> {
    const { guild, client } = member;

    try {
        if (isProd) {
            switch (guild.id) {
                case communityDiscordId:
                    await welcomeReward(member);
                    break;
                case banAppealDiscordId:
                    await createAppealChanel(member);
                    break;
                default:
                    await warnOnBannedMemberJoin(member);
            }
        }
    } catch (err) {
        await logError(client, err, 'client#guildMemberAdd', member);
    }
}
