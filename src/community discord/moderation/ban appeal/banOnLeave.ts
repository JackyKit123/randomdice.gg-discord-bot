import { appealServerChannelId } from 'config/channelIds';
import { appealServerRoleIds } from 'config/roleId';
import { CategoryChannel, GuildMember, PartialGuildMember } from 'discord.js';
import { archiveAppeal, reject } from './closeAppeal';

export default async function banOnLeave(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const {
        guild,
        roles,
        user,
        client: { user: clientUser },
    } = member;

    if (!user || !clientUser) return;

    const auditLogsBans = await guild.fetchAuditLogs({
        limit: 3,
        type: 'MEMBER_BAN_ADD',
    });
    const auditLogsKicks = await guild.fetchAuditLogs({
        limit: 3,
        type: 'MEMBER_KICK',
    });

    if (
        auditLogsBans.entries.some(
            ({ target, createdTimestamp }) =>
                target?.id === member.id &&
                Date.now() - createdTimestamp < 1000 * 60
        ) ||
        auditLogsKicks.entries.some(
            ({ target, createdTimestamp }) =>
                target?.id === member.id &&
                Date.now() - createdTimestamp < 1000 * 60
        ) ||
        roles.cache.hasAny(...Object.values(appealServerRoleIds))
    )
        return;

    const responseEmbed = await reject(
        member,
        clientUser,
        'Member left the server.'
    );

    const appealCat = guild.channels.cache.get(
        appealServerChannelId['Appeal Room']
    );
    if (appealCat instanceof CategoryChannel) {
        const appealRoomsWithoutMember = appealCat.children.filter(
            channel =>
                channel.id !== appealServerChannelId['ban-appeal-discussion'] &&
                channel.isText() &&
                !channel.permissionOverwrites.cache.some(
                    overwrite => overwrite.type === 'member'
                )
        );
        let appealRoom;
        if (appealRoomsWithoutMember.size === 1) {
            appealRoom = appealRoomsWithoutMember.first();
        } else {
            appealRoom = appealRoomsWithoutMember.find(
                channel =>
                    channel.name === `${user.username}-${user.discriminator}`
            );
        }
        if (appealRoom?.isText()) {
            await appealRoom.send({ embeds: [responseEmbed] });
            await archiveAppeal(appealRoom);
        }
    }
}
