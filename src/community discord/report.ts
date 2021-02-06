import * as Discord from 'discord.js';
import cooldown from '../helper/cooldown';
import parseMsIntoReadableText from '../helper/parseMS';

async function closeReport(message: Discord.Message): Promise<void> {
    const { member, channel, guild, content } = message;

    if (
        await cooldown(message, '!closereport', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }
    if (!guild || !member) {
        return;
    }
    const modRoleId = '804223928427216926';
    const tModRoleId = '807219483311603722';
    if (
        !(
            member.roles.cache.has(modRoleId) ||
            member.roles.cache.has(tModRoleId) ||
            (channel as Discord.TextChannel)
                .permissionsFor(member)
                ?.has('MANAGE_CHANNELS')
        )
    ) {
        await channel.send('You do not have permission to close this report.');
        return;
    }
    if (!(channel as Discord.TextChannel).name.endsWith('-report-room')) {
        await channel.send('You cannot use this command here.');
        return;
    }
    if ((channel as Discord.TextChannel).parentID === '806634775514710106') {
        await channel.send('This report is already closed.');
        return;
    }
    if (content.replace('!closereport', '').trim().length > 1024) {
        await channel.send(
            'Close report reason should be less than 1024 characters.'
        );
        return;
    }

    const reportedMemberId = (channel as Discord.TextChannel).permissionOverwrites.find(
        overwrite => overwrite.type === 'member'
    )?.id;
    const reportMember = guild.members.cache.get(reportedMemberId || '');
    const archiveCat = guild.channels.cache.get('806634775514710106');
    if (archiveCat) {
        await (channel as Discord.TextChannel).setParent('806634775514710106', {
            reason: 'Report Closed',
        });
    } else {
        await channel.send(
            'Unable to retrieve Archive channel category, please contact an admin to manually drag this channel into Archive category.'
        );
    }
    const reportLog = guild.channels.cache.get('806812461302022145');
    const now = Date.now();
    if (reportLog?.type === 'text') {
        let embed = new Discord.MessageEmbed()
            .setTitle('Report Closed')
            .setDescription(content.replace('!closereport', ''))
            .addField(
                'Report Closed By',
                `**Name:** ${member.user.username}#${
                    member.user.discriminator
                } ${member.toString()}` +
                    '\n' +
                    `**ID:** ${member.user.id}`
            )
            .setFooter('Report Closed at')
            .setTimestamp();
        if (reportMember) {
            embed = embed.setAuthor(
                `${reportMember.user.username}#${reportMember.user.discriminator}`,
                reportMember.user.displayAvatarURL({
                    dynamic: true,
                })
            );
            embed.addField(
                'Report Member',
                `**Name:** ${reportMember.user.username}#${
                    reportMember.user.discriminator
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
        const reportLogMessages = await (reportLog as Discord.TextChannel).messages.fetch();
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
            await initialLogMessage.edit(
                initialLogMessage.embeds.map(emb => {
                    const edited = emb
                        .setTitle('Report Closed')
                        .setColor('#000000')
                        .addField(
                            'Report Closed by',
                            `**Name:** ${member.user.username}#${
                                member.user.discriminator
                            } ${member.toString()}` +
                                '\n' +
                                `**Closed at**: ${message.createdAt.toUTCString()}` +
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
                })
            );
        } else {
            await (reportLog as Discord.TextChannel).send(embed);
        }
    }
    const { everyone } = guild.roles;
    const modRole = guild.roles.cache.get(modRoleId);
    await (channel as Discord.TextChannel).overwritePermissions(
        [
            {
                id: everyone,
                deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
            },
            {
                id: modRole as Discord.Role,
                allow: ['VIEW_CHANNEL'],
            },
        ],
        'Archive Channel.'
    );
    await channel.send(
        `Report closed, removed access for everyone, archiving this channel.`
    );
    await reportMember?.send(
        new Discord.MessageEmbed()
            .setTitle('Report Closed')
            .setColor('#6ba4a5')
            .setAuthor(
                `Moderator: ${member.user.username}#${member.user.discriminator}`,
                member.user.displayAvatarURL({
                    dynamic: true,
                })
            )
            .setDescription(content.replace('!closereport', ''))
            .setFooter('Report closed at')
            .setTimestamp()
    );
}

export default async function report(message: Discord.Message): Promise<void> {
    const {
        member,
        guild,
        channel,
        author,
        content,
        mentions,
        createdTimestamp,
    } = message;

    const [command, ...args] = content.split(' ');
    if (command === '!closereport') {
        closeReport(message);
    }
    if (command !== '!report' || !guild || !member) {
        return;
    }
    if (
        await cooldown(message, '!report', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (message.deletable) {
        try {
            await message.delete();
        } catch {
            // suppress error
        }
    }
    const now = Date.now();
    const lastMessage = channel.lastMessageID;
    const memberMentions = mentions.members;
    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${author.username}#${author.discriminator}`,
            author.displayAvatarURL({ dynamic: true })
        )
        .setTitle('New Report')
        .setColor('#00ff00')
        .setDescription(args.join(' '))
        .addField(
            'Member Info',
            `**Name:** ${author.username}#${
                author.discriminator
            } ${author.toString()}` +
                '\n' +
                `**Joined at:** ${parseMsIntoReadableText(
                    now - (member.joinedTimestamp || now),
                    true
                )} ago` +
                '\n' +
                `**Account Created:** ${parseMsIntoReadableText(
                    now - author.createdTimestamp,
                    true
                )} ago` +
                '\n' +
                `**Reported from:** ${channel.toString()} [Jump to context](https://discord.com/channels/804222694488932362/${
                    channel.id
                }/${lastMessage})`
        )
        .setFooter(`Report ID: ${message.id}`)
        .setTimestamp(createdTimestamp);
    Array.from(memberMentions || []).forEach(([, m], i) => {
        embed = embed.addField(
            `Mentioned user #${i + 1}`,
            `**Name:** ${m.user.username}#${
                m.user.discriminator
            } ${m.toString()}` +
                '\n' +
                `**Joined at:** ${parseMsIntoReadableText(
                    now - (m.joinedTimestamp || now),
                    true
                )} ago` +
                '\n' +
                `**Account Created:** ${parseMsIntoReadableText(
                    now - m.user.createdTimestamp,
                    true
                )} ago` +
                '\n' +
                `**ID:** ${m.user.id}`
        );
    });
    const logChannel = guild.channels.cache.get('806812461302022145');
    const supportCategory = guild.channels.cache.get('804230480475848754');
    const modRole = guild.roles.cache.get('804223928427216926');
    const tModRole = guild.roles.cache.get('807219483311603722');
    const { everyone } = guild.roles;
    if (logChannel?.type === 'text') {
        await (logChannel as Discord.TextChannel).send(
            embed.setTitle('Member Report')
        );
    }
    const reportRoom = await guild.channels.create(
        `${author.username}-${author.discriminator}-report-room`,
        {
            parent: supportCategory,
            reason: 'Member Report',
            permissionOverwrites: [
                {
                    id: everyone,
                    deny: 'VIEW_CHANNEL',
                },
                {
                    id: member,
                    allow: 'VIEW_CHANNEL',
                },
                {
                    id: modRole as Discord.Role,
                    allow: ['VIEW_CHANNEL', 'MANAGE_MESSAGES'],
                },
                {
                    id: tModRole as Discord.Role,
                    allow: ['VIEW_CHANNEL', 'MANAGE_MESSAGES'],
                },
            ],
        }
    );
    const initMessage = await reportRoom.send(
        `${author.toString()}, please wait patiently for our ${modRole} ${tModRole} team to response, please describe the details of the report if it was not fully addressed in the \`!report\` command`,
        embed
    );
    await initMessage.pin();
}
