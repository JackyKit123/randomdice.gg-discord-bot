import Discord, {
    ApplicationCommandData,
    CommandInteraction,
    ContextMenuInteraction,
    DiscordAPIError,
    GuildMember,
    Message,
    TextBasedChannel,
} from 'discord.js';
import cooldown from 'util/cooldown';
import parseMsIntoReadableText from 'util/parseMS';
import { reply } from 'util/typesafeReply';

export async function closeReport(
    input: Message | CommandInteraction
): Promise<void> {
    const { channel, guild } = input;

    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    if (
        await cooldown(input, '!closereport', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }
    if (!guild || !member || channel?.type !== 'GUILD_TEXT') {
        return;
    }
    const content =
        input instanceof Message
            ? input.content.replace('!closereport', '').trim()
            : input.options.getString('reason') ?? '';
    const modRoleId = '804223928427216926';
    const tModRoleId = '807219483311603722';
    if (
        !(
            member.roles.cache.has(modRoleId) ||
            member.roles.cache.has(tModRoleId) ||
            channel.permissionsFor(member)?.has('MANAGE_CHANNELS')
        )
    ) {
        await reply(input, 'You do not have permission to close this report.');
        return;
    }
    if (!channel.name.endsWith('-report-room')) {
        await reply(input, 'You cannot use this command here.');
        return;
    }
    if (channel.parentId === '806634775514710106') {
        await reply(input, 'This report is already closed.');
        return;
    }
    if (content.length > 1024) {
        await reply(
            input,
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
        await reply(
            input,
            'Unable to retrieve Archive channel category, please contact an admin to manually drag this channel into Archive category.'
        );
        return;
    }
    if (archiveCat.children.size >= 50) {
        await reply(
            input,
            'There are too many reports in the archive category. Please delete some reports.'
        );
        return;
    }
    await channel.setParent('806634775514710106', {
        reason: 'Report Closed',
    });
    const reportLog = guild.channels.cache.get('806812461302022145');
    const now = Date.now();
    if (reportLog?.isText()) {
        let embed = new Discord.MessageEmbed()
            .setTitle('Report Closed')
            .setDescription(content.replace('!closereport', ''))
            .addField(
                'Report Closed By',
                `**Name:** ${member.user.tag} ${member.toString()}` +
                    '\n' +
                    `**ID:** ${member.user.id}`
            )
            .setFooter({ text: 'Report Closed at' })
            .setTimestamp();
        if (reportMember) {
            embed = embed.setAuthor({
                name: reportMember.user.tag,
                iconURL: reportMember.displayAvatarURL({
                    dynamic: true,
                }),
            });
            embed.addField(
                'Report Member',
                `**Name:** ${
                    reportMember.user.tag
                } ${reportMember.toString()}` +
                    '\n' +
                    `**Reported At**: ${parseMsIntoReadableText(
                        now - channel.createdTimestamp,
                        true
                    )} ago` +
                    '\n' +
                    `**ID:** ${member.user.id}`
            );
        }
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
        if (initialLogMessage) {
            await initialLogMessage.edit({
                embeds: initialLogMessage.embeds.map(emb => {
                    const edited = emb
                        .setTitle('Report Closed')
                        .setColor('#000000')
                        .addField(
                            'Report Closed by',
                            `**Name:** ${member.user.username}#${
                                member.user.discriminator
                            } ${member.toString()}` +
                                '\n' +
                                `**Closed at**: ${input.createdAt.toUTCString()}` +
                                '\n' +
                                `**ID:** ${member.user.id}`
                        );
                    if (content.replace('!closereport', '').trim()) {
                        return edited.addField(
                            'With reason',
                            content.replace('!closereport', '').trim()
                        );
                    }
                    return edited;
                }),
            });
        } else {
            await reportLog.send({ embeds: [embed] });
        }
    }
    const { everyone } = guild.roles;
    const modRole = guild.roles.cache.get(modRoleId);
    const tModRole = guild.roles.cache.get(tModRoleId);
    await channel.permissionOverwrites.set(
        [
            {
                id: everyone,
                deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            },
            {
                id: modRole ?? '',
                allow: ['VIEW_CHANNEL'],
            },
            {
                id: tModRole ?? '',
                allow: ['VIEW_CHANNEL'],
            },
        ],
        'Archive Channel.'
    );
    await reply(
        input,
        `Report closed, removed access for everyone, archiving this channel.`
    );
    await reportMember?.send({
        embeds: [
            new Discord.MessageEmbed()
                .setTitle('Report Closed')
                .setColor('#6ba4a5')
                .setAuthor({
                    name: `Moderator: ${member.user.tag}`,
                    iconURL: member.displayAvatarURL({
                        dynamic: true,
                    }),
                })
                .setDescription(content.replace('!closereport', ''))
                .setFooter({ text: 'Report closed at' })
                .setTimestamp(),
        ],
    });
}

export async function report(
    input: Message | CommandInteraction | ContextMenuInteraction
): Promise<void> {
    const { guild, channel, createdTimestamp } = input;

    const member = guild?.members.cache.get(input.member?.user.id ?? '');

    const content =
        // eslint-disable-next-line no-nested-ternary
        (input instanceof Message
            ? input.content.replace('!report', '').trim()
            : input instanceof CommandInteraction
            ? input.options.getString('message')
            : input.options.getMessage('message')?.content) ?? 'not specific';
    if (!guild || !member) {
        return;
    }
    if (
        await cooldown(input, '!report', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (input instanceof Message) {
        try {
            await input.delete();
        } catch (err) {
            if ((err as DiscordAPIError).message !== 'Unknown Message')
                throw err;
        }
    }
    const now = Date.now();
    const messageLink =
        input instanceof ContextMenuInteraction
            ? input.options.getMessage('message')?.id
            : input.channel?.lastMessageId;
    const memberMentions =
        // eslint-disable-next-line no-nested-ternary
        input instanceof ContextMenuInteraction
            ? [input.options.getMessage('message')?.member]
            : input instanceof CommandInteraction
            ? [input.options.getMember('member') as GuildMember]
            : Array.from(
                  input.mentions.members?.values() ?? ([] as GuildMember[])
              );
    let embed = new Discord.MessageEmbed()
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
                `**Reported from:** ${channel} [Jump to context](https://discord.com/channels/804222694488932362/${channel?.id}/${messageLink})`
        )
        .setFooter({ text: `Report ID: ${input.id}` })
        .setTimestamp(createdTimestamp);
    memberMentions.forEach((m, i) => {
        const mentioned = guild.members.cache.get(m?.user?.id ?? '');
        if (mentioned)
            embed = embed.addField(
                `Mentioned user #${i + 1}`,
                `**Name:** ${mentioned.user.tag} ${m}` +
                    '\n' +
                    `**Joined at:** ${parseMsIntoReadableText(
                        now - (mentioned.joinedTimestamp || now),
                        true
                    )} ago` +
                    '\n' +
                    `**Account Created:** ${parseMsIntoReadableText(
                        now - mentioned.user.createdTimestamp,
                        true
                    )} ago` +
                    '\n' +
                    `**ID:** ${mentioned.user.id}`
            );
    });
    const logChannel = guild.channels.cache.get('806812461302022145');
    const supportCategory = guild.channels.cache.get('804230480475848754');
    const modRole = guild.roles.cache.get('804223928427216926');
    const tModRole = guild.roles.cache.get('807219483311603722');
    const { everyone } = guild.roles;
    if (!(supportCategory instanceof Discord.CategoryChannel)) {
        throw new Error('unable to locate server support category');
    }
    if (logChannel?.isText()) {
        await logChannel.send({ embeds: [embed.setTitle('Member Report')] });
    }
    const reportRoom = (await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-report-room`,
        {
            parent: supportCategory,
            reason: 'Member Report',
            permissionOverwrites: [
                {
                    id: everyone,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: member,
                    allow: ['VIEW_CHANNEL'],
                },
                {
                    id: modRole ?? '',
                    allow: ['VIEW_CHANNEL', 'MANAGE_MESSAGES'],
                },
                {
                    id: tModRole ?? '',
                    allow: ['VIEW_CHANNEL', 'MANAGE_MESSAGES'],
                },
            ],
        }
    )) as TextBasedChannel;
    const initMessage = await reportRoom.send({
        content: `${member.user.toString()}, please wait patiently for our ${modRole} ${tModRole} team to response, please describe the details of the report if it was not fully addressed in the \`!report\` command`,
        embeds: [embed],
    });
    await initMessage.pin();
    if (!(input instanceof Message)) {
        reply(
            input,
            `A report channel has been created, please wait patiently for our ${modRole} ${tModRole} team to response, please describe the details of the report if it was not fully addressed in the \`!report\` command`,
            true
        );
    }
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
