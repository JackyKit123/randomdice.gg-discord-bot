import { appealServerChannelId } from 'config/channelIds';
import { banHammer } from 'config/emojiId';
import roleIds, { appealServerRoleIds } from 'config/roleId';
import logMessage from 'util/logMessage';
import {
    CategoryChannel,
    ClientUser,
    GuildMember,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { setTimer } from '../timer';

export default async function createAppealChanel(
    member: GuildMember
): Promise<void> {
    const { client, id, guild } = member;
    const { COMMUNITY_SERVER_ID } = process.env;

    if (!COMMUNITY_SERVER_ID) {
        await logMessage(
            client,
            'error',
            'Missing COMMUNITY_SERVER_ID in .env file. Please add it.'
        );
        return;
    }

    const communityDiscord = client.guilds.cache.get(COMMUNITY_SERVER_ID);
    if (!communityDiscord) {
        await logMessage(
            client,
            'error',
            'Community Discord server is not located.'
        );
        return;
    }

    const logChannel = guild.channels.cache.get(appealServerChannelId.log);

    const auditLogs = await communityDiscord.fetchAuditLogs({
        type: 'MEMBER_BAN_ADD',
    });
    const ban = await communityDiscord.bans.fetch(id);
    let banTimestamp = 0;
    auditLogs.entries.forEach(entry => {
        if (entry.target?.id === id) {
            banTimestamp = entry.createdTimestamp;
        }
    });
    const communityMember = communityDiscord.members.cache.get(id);
    if (!ban) {
        if (communityMember?.roles.cache.has(roleIds.Moderator)) {
            await member.roles.add(appealServerRoleIds.Moderator);
            return;
        }
        if (communityMember?.roles.cache.has(roleIds['Trial Moderator'])) {
            await member.roles.add(appealServerRoleIds['Trial Moderator']);
            return;
        }
        await member.user.send(
            'You are not banned in the main discord, you are kicked from the ban appeal discord.'
        );
        await member.kick(
            'Member joined without being banned in the main discord.'
        );
        if (logChannel?.isText()) {
            await logChannel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({
                            name: member.user.tag,
                            iconURL: member.displayAvatarURL({ dynamic: true }),
                        })
                        .setTitle('Kicked')
                        .setColor('#e57f7f')
                        .setDescription(
                            'Member joined without being banned in the main discord.'
                        )
                        .setTimestamp(),
                ],
            });
        }
        return;
    }

    const appealRoomCat = guild.channels.cache.get(
        appealServerChannelId['Appeal Room']
    );
    const appealRoom = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}`,
        {
            parent:
                appealRoomCat instanceof CategoryChannel
                    ? appealRoomCat
                    : undefined,
            type: 'GUILD_TEXT',
        }
    );
    await appealRoom.permissionOverwrites.edit(member, {
        VIEW_CHANNEL: true,
    });
    let banInfo = new MessageEmbed()
        .setTitle('Ban Info')
        .setColor('#6ba4a5')
        .setAuthor({
            name: ban.user.tag,
            iconURL: ban.user.displayAvatarURL({ dynamic: true }),
        })
        .addField(
            'Ban Reason',
            ban.reason?.replace(
                '\nFeel free to [appeal here](https://discord.gg/yJBdSRZJmS) if you found this ban to be unjustified.',
                ''
            ) ?? 'Not provided'
        );
    if (banTimestamp) {
        banInfo = banInfo
            .setTimestamp(banTimestamp)
            .setFooter({ text: 'Banned at: ' });
    }
    await appealRoom.send({
        content: member.toString(),
        embeds: [
            new MessageEmbed()
                .setTitle('Appeal Form')
                .setAuthor({
                    name: 'randomdice.gg Ban Appeal Server',
                    iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
                })
                .setDescription(
                    `Before we can start processing your application for a ban, we need important key information from you.\n` +
                        `It should be said that your application will be rejected with immediate effect if we expose one or more of your information as a lie.\n` +
                        `Please answer the following questions: `
                )
                .setColor('#6ba4a5')
                .addField(
                    'Why were you banned?',
                    '*Describe the rules you have broken which lead to the ban*'
                )
                .addField(
                    'Why should you be unbanned?',
                    '*You will only be unbanned if you are not guilty*'
                )
                .addField(
                    'Would you like to add further information to your application that could help with your unban?',
                    '*If so, please attach them.*'
                )
                .setTimestamp(),
            banInfo,
        ],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setEmoji('✅')
                    .setLabel('Accept Appeal')
                    .setCustomId('appeal-accept')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setEmoji(banHammer)
                    .setLabel('Reject Appeal')
                    .setCustomId('appeal-reject')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setEmoji('❌')
                    .setLabel('Not guilty')
                    .setCustomId('appeal-falsebanned')
                    .setStyle('PRIMARY'),
            ]),
        ],
    });
    await setTimer(
        appealRoom,
        guild.members.cache.get((client.user as ClientUser).id) as GuildMember,
        'You have 24 hours to respond to this appeal ticket or you will be banned',
        1000 * 60 * 60 * 24
    );
    if (logChannel?.isText()) {
        await logChannel.send({
            embeds: [banInfo.setTitle('Ban Appeal Created')],
        });
    }
}
