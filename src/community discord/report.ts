import channelIds from 'config/channelIds';
import { moderatorRoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    ContextMenuInteraction,
    MessageEmbed,
    Permissions,
    CategoryChannel,
} from 'discord.js';
import cooldown from 'util/cooldown';
import getMessageLink from 'util/getMessageLink';
import parseMsIntoReadableText from 'util/parseMS';

export async function closeReport(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, guild, member } = interaction;

    if (
        (await cooldown(interaction, {
            default: 10 * 1000,
            donator: 10 * 1000,
        })) ||
        !channel?.isText() ||
        channel.isThread()
    ) {
        return;
    }

    const reason = interaction.options.getString('reason')?.trim() ?? '';

    if (
        !(
            member.roles.cache.hasAny(...moderatorRoleIds) ||
            channel.permissionsFor(member)?.has('MANAGE_CHANNELS')
        )
    ) {
        await interaction.reply(
            'You do not have permission to close this report.'
        );
        return;
    }
    if (!channel.name.endsWith('-report-room')) {
        await interaction.reply('You cannot use this command here.');
        return;
    }
    if (channel.parentId === channelIds['📦 | Report Archives']) {
        await interaction.reply('This report is already closed.');
        return;
    }
    if (reason.length > 1024) {
        await interaction.reply(
            'Close report reason should be less than 1024 characters.'
        );
        return;
    }

    const reportedMemberId = channel.permissionOverwrites.cache.find(
        overwrite => overwrite.type === 'member'
    )?.id;
    const reportMember = guild.members.cache.get(reportedMemberId || '');
    const archiveCat = guild.channels.cache.get(
        channelIds['📦 | Report Archives']
    );

    if (archiveCat?.type !== 'GUILD_CATEGORY') {
        await interaction.reply(
            'Unable to retrieve Archive channel category, please contact an admin to manually drag this channel into Archive category.'
        );
        return;
    }
    if (archiveCat.children.size >= 50) {
        await interaction.reply(
            'There are too many reports in the archive category. Please delete some reports.'
        );
        return;
    }
    await channel.setParent(channelIds['📦 | Report Archives'], {
        reason: 'Report Closed',
    });
    const reportLog = guild.channels.cache.get(channelIds['report-log']);

    if (reportLog?.isText()) {
        const pinnedMessages = await channel.messages.fetchPinned();
        const reportLogMessages = await reportLog.messages.fetch();
        const initialLogMessage = reportLogMessages.find(msg =>
            msg.embeds.some(emb =>
                pinnedMessages.some(pinMsg =>
                    pinMsg.embeds.some(
                        e =>
                            e.footer?.text && e.footer.text === emb.footer?.text
                    )
                )
            )
        );

        const editCloseReportLogEmbed = (embed: MessageEmbed) => {
            const edited = embed
                .setTitle('Report Closed')
                .setColor('#000000')
                .addField(
                    'Report Closed by',
                    `**Name:** ${member.user.username}#${
                        member.user.discriminator
                    } ${member.toString()}` +
                        '\n' +
                        `**Closed at**: ${interaction.createdAt.toUTCString()}` +
                        '\n' +
                        `**ID:** ${member.user.id}`
                );
            if (reason) {
                return edited.addField('With reason', reason);
            }
            return edited;
        };

        if (initialLogMessage) {
            await initialLogMessage.edit({
                embeds: initialLogMessage.embeds.map(editCloseReportLogEmbed),
            });
        } else {
            await reportLog.send({
                embeds: [editCloseReportLogEmbed(new MessageEmbed())],
            });
        }
    }
    const { everyone } = guild.roles;
    await channel.permissionOverwrites.set(
        [
            {
                id: everyone,
                deny: new Permissions(['VIEW_CHANNEL', 'SEND_MESSAGES']),
            },
            ...moderatorRoleIds.map(id => ({
                id,
                allow: new Permissions(['VIEW_CHANNEL']),
            })),
        ],
        'Archive Channel.'
    );
    await interaction.reply(
        `Report closed, removed access for everyone, archiving this channel.`
    );
    await reportMember?.send({
        embeds: [
            new MessageEmbed()
                .setTitle('Report Closed')
                .setColor('#6ba4a5')
                .setAuthor({
                    name: `Moderator: ${member.user.tag}`,
                    iconURL: member.displayAvatarURL({
                        dynamic: true,
                    }),
                })
                .setDescription(reason)
                .setFooter({ text: 'Report closed at' })
                .setTimestamp(),
        ],
    });
}

export async function report(
    interaction: CommandInteraction | ContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const { guild, member, channel, createdTimestamp } = interaction;

    const content =
        interaction instanceof CommandInteraction
            ? interaction.options.getString('message') ?? 'not specific'
            : `Message Reported:\n${
                  interaction.options.getMessage('message', true)?.content
              }`;

    if (
        await cooldown(
            interaction,
            {
                default: 10 * 1000,
                donator: 10 * 1000,
            },
            'report'
        )
    ) {
        return;
    }

    const now = Date.now();
    const messageId =
        interaction instanceof ContextMenuInteraction
            ? interaction.options.getMessage('message')?.id
            : interaction.channel?.lastMessageId;
    const memberReported =
        interaction instanceof ContextMenuInteraction
            ? interaction.options.getMessage('message')?.member
            : interaction.options.getMember('member');
    let embed = new MessageEmbed()
        .setAuthor({
            name: member.user.tag,
            iconURL: member.displayAvatarURL({ dynamic: true }),
        })
        .setTitle('New Report')
        .setColor('#00ff00')
        .setDescription(content)
        .addField(
            'Member Info',
            `${
                `**Name:** ${member.user.username}#${member.user.discriminator} ${member}` +
                '\n' +
                `**Joined at:** ${parseMsIntoReadableText(
                    now - (member.joinedTimestamp || now),
                    true
                )} ago` +
                '\n' +
                `**Account Created:** ${parseMsIntoReadableText(
                    now - member.user.createdTimestamp,
                    true
                )} ago` +
                '\n'
            }${
                messageId && channel
                    ? `**Reported from:** ${channel} [Jump to context](${getMessageLink(
                          messageId,
                          channel
                      )})`
                    : ''
            }`
        )
        .setFooter({ text: `Report ID: ${interaction.id}` })
        .setTimestamp(createdTimestamp);

    if (memberReported)
        embed = embed.addField(
            memberReported.user.tag,
            `**Member:** ${memberReported}` +
                '\n' +
                `**Joined at:** ${parseMsIntoReadableText(
                    now - (memberReported.joinedTimestamp || now),
                    true
                )} ago` +
                '\n' +
                `**Account Created:** ${parseMsIntoReadableText(
                    now - memberReported.user.createdTimestamp,
                    true
                )} ago` +
                '\n' +
                `**ID:** ${memberReported.user.id}`
        );

    const logChannel = guild.channels.cache.get(channelIds['report-log']);
    const supportCategory = guild.channels.cache.get(
        channelIds['🆘 | Support Channels']
    );

    const { everyone } = guild.roles;

    if (logChannel?.isText()) {
        await logChannel.send({ embeds: [embed.setTitle('Member Report')] });
    }
    const reportRoom = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-report-room`,
        {
            type: 'GUILD_TEXT',
            parent:
                supportCategory instanceof CategoryChannel
                    ? supportCategory
                    : undefined,
            reason: 'Member Report',
            permissionOverwrites: [
                {
                    id: everyone,
                    deny: new Permissions(['VIEW_CHANNEL']),
                },
                {
                    id: member,
                    allow: new Permissions(['VIEW_CHANNEL']),
                },
                ...moderatorRoleIds.map(id => ({
                    id,
                    allow: new Permissions(['VIEW_CHANNEL', 'MANAGE_MESSAGES']),
                })),
            ],
        }
    );
    const initMessage = await reportRoom.send({
        content: `${member}, please wait patiently for our ${moderatorRoleIds
            .map(id => `<@&${id}>`)
            .join(
                ' '
            )} team to response, please describe the details of the report if it was not fully addressed in the \`/report\` command`,
        embeds: [embed],
    });
    await initMessage.pin();

    await interaction.reply({
        content: `A report channel has been created, please wait patiently for our ${moderatorRoleIds
            .map(id => `<@&${id}>`)
            .join(
                ' '
            )} team to response, please describe the details of the report if it was not fully addressed in the \`/report\` command`,
        ephemeral: true,
    });
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'report',
        description: 'Report a member',
        options: [
            {
                name: 'member',
                description: 'the member to report',
                type: 6,
            },
            {
                name: 'message',
                description: 'describe your report',
                type: 3,
            },
        ],
    },
    {
        name: 'Report this message',
        type: 3,
    },
    {
        name: 'closereport',
        description: 'Close a report',
        defaultPermission: false,
        options: [
            {
                name: 'reason',
                description: 'reason for closing the report',
                type: 3,
            },
        ],
    },
];
