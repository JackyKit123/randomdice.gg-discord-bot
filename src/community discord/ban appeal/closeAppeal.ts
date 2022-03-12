import { appealServerChannelId } from 'config/channelIds';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CategoryChannel,
    Collection,
    CommandInteraction,
    Guild,
    GuildBasedChannel,
    MessageEmbed,
    UserContextMenuInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';

export async function archiveAppeal(
    guild: Guild,
    channel: GuildBasedChannel | null
): Promise<void> {
    const archiveCategories = guild.channels.cache.filter(
        chl =>
            /archives/i.test(chl.name) &&
            chl instanceof CategoryChannel &&
            chl.children.size < 50
    ) as Collection<string, CategoryChannel>;
    const archiveCategory =
        archiveCategories.last() ??
        (await guild.channels.create('Archives', {
            type: 'GUILD_CATEGORY',
            position: -1,
        }));

    if (channel?.type === 'GUILD_TEXT')
        await channel.setParent(archiveCategory);
}

export default async function closeAppeal(
    interaction:
        | CommandInteraction
        | ButtonInteraction
        | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, member, guild, channel } = interaction;

    const { COMMUNITY_SERVER_ID } = process.env;

    if (!COMMUNITY_SERVER_ID) {
        throw new Error('Missing `COMMUNITY_SERVER_ID` env in bot code.');
    }

    const communityDiscord = client.guilds.cache.get(COMMUNITY_SERVER_ID);

    if (!communityDiscord) {
        throw new Error('Community Discord server is not located.');
    }

    if (!channel || !channel.isText() || channel.isThread()) return;

    const membersInAppealRoom = channel.permissionOverwrites.cache.filter(
        overwrite => overwrite.type === 'member'
    );

    const target =
        (interaction instanceof CommandInteraction &&
            interaction.options.getMember('member')) ||
        (membersInAppealRoom.size === 1 &&
            (await guild.members.fetch(membersInAppealRoom.first()?.id ?? '')));

    const reason =
        interaction instanceof CommandInteraction &&
        interaction.options.getString('reason');
    const logChannel = guild.channels.cache.get(appealServerChannelId.log);

    if (!target) {
        await interaction.reply({
            content: 'Please provide a valid member to close the appeal.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    if (target.id === member.id) {
        await interaction.reply({
            content: 'You cannot close your own appeal.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    if (!member.permissions.has('BAN_MEMBERS')) {
        await interaction.reply({
            content:
                'You do not have sufficient permission to execute this command.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    let logEmbed = new MessageEmbed()
        .setAuthor({
            name: target.user.tag,
            iconURL: target.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp()
        .addField(
            'Appeal closed by',
            `${member.displayName}\n${member.toString()}`
        );

    if (reason) {
        logEmbed = logEmbed.setDescription(reason);
    }

    const accept = async (): Promise<void> => {
        await communityDiscord.members.unban(
            target,
            `Appealed accepted in appeal server. ${reason ?? ''}`.trim()
        );

        try {
            await target.send(
                `Your appeal is accepted.\n${
                    reason ? `Reason: ${reason}\n` : ''
                }You may now return to this main server. https://discord.gg/ZrXRpZq2mq`
            );
        } finally {
            await guild.members.ban(target, {
                reason: `Appeal accepted. ${reason ?? ''}`.trim(),
            });
            const appealLog = logEmbed
                .setTitle('Appeal accepted')
                .setColor('#e5ffe5');
            await interaction.reply({ embeds: [appealLog] });
            if (logChannel?.isText()) {
                await logChannel.send({ embeds: [appealLog] });
            }
        }
    };

    const reject = async (): Promise<void> => {
        try {
            await target.send(
                `Your appeal is rejected.${reason ? `\nReason: ${reason}` : ''}`
            );
        } finally {
            await guild.members.ban(target, {
                reason: `Appeal rejected.\n${reason ?? ''}`.trim(),
            });
            const appealLog = logEmbed
                .setTitle('Appeal rejected')
                .setColor('#ff3434');
            await interaction.reply({ embeds: [appealLog] });
            if (logChannel?.isText()) {
                await logChannel.send({ embeds: [appealLog] });
            }
        }
    };

    const falsebanned = async (): Promise<void> => {
        await communityDiscord.members.unban(
            target,
            `Appealed accepted in appeal server, member is not guilty. ${
                reason ?? ''
            }`.trim()
        );

        try {
            await target.send(
                'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
            );
        } finally {
            await guild.members.kick(
                target,
                `Member is not guilty, appeal closed. ${reason ?? ''}`.trim()
            );
            const appealLog = logEmbed
                .setTitle('Member is not guilty')
                .setColor('#e5ffe5');
            await interaction.reply({ embeds: [appealLog] });
            if (logChannel?.isText()) {
                await logChannel.send({ embeds: [appealLog] });
            }
        }
    };

    const executorRole = member.roles.highest;
    const targetRole = target.roles.highest;

    if (executorRole.comparePositionTo(targetRole) < 0) {
        await interaction.reply(
            'You do not have sufficient permission to ban or unban this user.'
        );
        return;
    }

    if (
        await cooldown(interaction, 'close appeal', {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }

    await archiveAppeal(guild, channel);

    switch (
        interaction instanceof ButtonInteraction
            ? interaction.customId
            : interaction.commandName
    ) {
        case 'accept':
        case 'appeal-accept':
        case 'Accept Appeal':
            await accept();
            break;
        case 'reject':
        case 'appeal-reject':
        case 'Reject Appeal':
            await reject();
            break;
        case 'falsebanned':
        case 'appeal-falsebanned':
        case 'Not Guilty':
            await falsebanned();
            break;
        default:
    }
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'accept',
        description: 'Accepts the appeal.',
        options: [
            {
                name: 'member',
                description: 'The member to accept the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'reject',
        description: 'Rejects the appeal.',
        options: [
            {
                name: 'member',
                description: 'The member to reject the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'falsebanned',
        description: 'Closes the appeal as false banned.',
        options: [
            {
                name: 'member',
                description: 'The member to close the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'Accept Appeal',
        type: 'USER',
    },
    {
        name: 'Reject Appeal',
        type: 'USER',
    },
    {
        name: 'Not Guilty',
        type: 'USER',
    },
];
