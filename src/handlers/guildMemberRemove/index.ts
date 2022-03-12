import banOnLeave from 'community discord/ban appeal/banOnLeave';
import { deleteCustomRoleOnGuildLeave } from 'community discord/customRole';
import logMessage from 'dev-commands/logMessage';
import { GuildMember, PartialGuildMember } from 'discord.js';

export default async function guildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild, client } = member;

    const asyncPromisesCapturer: Promise<unknown>[] = [];
    if (process.env.NODE_ENV === 'production') {
        switch (guild.id) {
            case process.env.COMMUNITY_SERVER_ID:
                asyncPromisesCapturer.push(
                    deleteCustomRoleOnGuildLeave(member)
                );
                break;
            case process.env.COMMUNITY_APPEAL_SERVER_ID:
                asyncPromisesCapturer.push(banOnLeave(member));
                break;
            default:
        }
    }

    try {
        await Promise.all(asyncPromisesCapturer);
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
