import createAppealChanel from 'community discord/moderation/ban appeal/createAppealChannel';
import welcomeReward from 'community discord/currency/welcomeReward';
import logMessage from 'util/logMessage';
import { GuildMember } from 'discord.js';
import { banAppealDiscordId, communityDiscordId } from 'config/guild';
import { isProd } from 'config/env';

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
            }
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when listening to guildMemberAdd in server ${
                guild.name
            }.\n${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
