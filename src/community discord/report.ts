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
import parseMsIntoReadableText from 'util/parseMS';

export async function closeReport(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, guild, member, commandName } = interaction;

    if (
        (await cooldown(interaction, commandName, {
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
    if (channel.parentId === '806634775514710106') {
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
    const archiveCat = guild.channels.cache.get('806634775514710106');

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
    await channel.setParent('806634775514710106', {
        reason: 'Report Closed',
    });
    const reportLog = guild.channels.cache.get('806812461302022145');

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
        await cooldown(interaction, '!report', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
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
                '\n' +
                `**Reported from:** ${channel} [Jump to context](https://com/channels/804222694488932362/${channel?.id}/${messageId})`
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

    const logChannel = guild.channels.cache.get('806812461302022145');
    const supportCategory = guild.channels.cache.get('804230480475848754');

    const { everyone } = guild.roles;
    if (!(supportCategory instanceof CategoryChannel)) {
        await interaction.reply({
            content:
                'Unable to locate server support category, please contact an admin.',
            ephemeral: true,
        });
        return;
    }
    if (logChannel?.isText()) {
        await logChannel.send({ embeds: [embed.setTitle('Member Report')] });
    }
    const reportRoom = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-report-room`,
        {
            type: 'GUILD_TEXT',
            parent: supportCategory,
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
        content: `${member}, please wait patiently for our ${moderatorRoleIds.join(
            ' '
        )} team to response, please describe the details of the report if it was not fully addressed in the \`/report\` command`,
        embeds: [embed],
    });
    await initMessage.pin();

    await interaction.reply({
        content: `A report channel has been created, please wait patiently for our ${moderatorRoleIds.join(
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
