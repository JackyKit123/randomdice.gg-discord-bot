import banOnLeave from 'community discord/moderation/ban appeal/banOnLeave';
import { deleteCustomRoleOnGuildLeave } from 'community discord/customRole';
import logMessage from 'util/logMessage';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { writeModLogOnGenericKick } from 'community discord/moderation/modlog';
import { banAppealDiscordId, communityDiscordId } from 'config/guild';
import { isProd } from 'config/env';

export default async function guildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild, client } = member;

    try {
        if (isProd) {
            switch (guild.id) {
                case communityDiscordId:
                    await Promise.all([
                        (deleteCustomRoleOnGuildLeave(member),
                        writeModLogOnGenericKick(member)),
                    ]);
                    break;
                case banAppealDiscordId:
                    await banOnLeave(member);
                    break;
                default:
            }
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when listening to guildMemberRemove in server ${
                guild.name
            }.\n${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
