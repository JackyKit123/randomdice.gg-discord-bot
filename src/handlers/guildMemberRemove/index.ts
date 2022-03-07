import { deleteCustomRoleOnGuildLeave } from 'community discord/customRole';
import { GuildMember, PartialGuildMember } from 'discord.js';

export default async function guildMemberRemove(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild } = member;

    let asyncPromisesCapturer: Promise<unknown>[] = [];
    if (
        process.env.COMMUNITY_SERVER_ID === guild.id &&
        process.env.NODE_ENV === 'production'
    ) {
        asyncPromisesCapturer = [deleteCustomRoleOnGuildLeave(member)];
    }

    await Promise.all(asyncPromisesCapturer);
}
