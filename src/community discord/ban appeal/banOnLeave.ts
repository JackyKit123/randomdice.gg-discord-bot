import { appealServerChannelId } from 'config/channelIds';
import { appealServerRoleIds } from 'config/roleId';
import {
    CategoryChannel,
    GuildMember,
    MessageEmbed,
    PartialGuildMember,
} from 'discord.js';

export default async function banOnLeave(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    const {
        guild,
        roles,
        user: { tag },
        client: { user },
    } = member;

    if (roles.cache.hasAny(...Object.values(appealServerRoleIds))) return;

    await member.ban({
        reason: 'Appeal rejected. Member Left.',
    });
    const appealLog = new MessageEmbed()
        .setAuthor({
            name: member.user.tag,
            iconURL: member.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp()
        .setDescription('Member Left.')
        .addField('Appeal closed by', `${user?.username ?? ''}\n${user}`.trim())
        .setTitle('Appeal rejected')
        .setColor('#ff3434');

    const logChannel = guild.channels.cache.get(appealServerChannelId.log);

    if (logChannel?.isText()) {
        await logChannel.send({ embeds: [appealLog] });
    }

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
        if (appealRoomsWithoutMember.size === 0) {
            return;
        }
        let appealRoom;
        if (appealRoomsWithoutMember.size === 1) {
            appealRoom = appealRoomsWithoutMember.first();
        } else {
            appealRoom = appealRoomsWithoutMember.find(
                channel => channel.name === tag.replace('#', '')
            );
        }
        if (appealRoom?.isText()) {
            await appealRoom.send({ embeds: [appealLog] });
        }
    }
}
