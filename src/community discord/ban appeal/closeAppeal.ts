import {
    ApplicationCommandData,
    CategoryChannel,
    ClientUser,
    Collection,
    CommandInteraction,
    GuildMember,
} from 'discord.js';
import cooldown from 'util/cooldown';

export default async function closeAppeal(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, member, guild, channel, commandName, options } =
        interaction;

    const { COMMUNITY_SERVER_ID } = process.env;

    if (
        !channel ||
        !channel.isText() ||
        channel.isThread() ||
        (await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 60 * 1000,
        }))
    ) {
        return;
    }

    if (!COMMUNITY_SERVER_ID) {
        throw new Error('Missing `COMMUNITY_SERVER_ID` env in bot code.');
    }

    const communityDiscord = client.guilds.cache.get(COMMUNITY_SERVER_ID);

    if (!communityDiscord) {
        throw new Error('Community Discord server is not located.');
    }

    const target =
        options.getMember('member') ??
        guild.members.cache.get(
            channel.permissionOverwrites.cache.find(
                overwrite =>
                    overwrite.type === 'member' && overwrite.id === member.id
            )?.id ?? ''
        );

    if (!target) {
        await interaction.reply(
            'Please provide a valid member to close the appeal.'
        );
        return;
    }

    const accept = async (): Promise<void> => {
        await communityDiscord.members.unban(
            target,
            'Appealed accepted in appeal server.'
        );

        try {
            await target.send(
                'Your appeal is accepted, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
            );
        } finally {
            await guild.members.ban(target, {
                reason: 'Appeal accepted.',
            });
            await interaction.reply(
                `Accepted appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.tag}**`
                        : `<@${target}>`
                }.`
            );
        }
    };

    const reject = async (): Promise<void> => {
        try {
            await target.send('Your appeal is rejected.');
        } finally {
            await guild.members.ban(target, {
                reason: 'Appeal rejected.',
            });
            await interaction.reply(
                `Rejected appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.tag}**`
                        : `<@${target}>`
                }.`
            );
        }
    };

    const falsebanned = async (): Promise<void> => {
        await communityDiscord.members.unban(
            target,
            'Appealed accepted in appeal server, member is not guilty.'
        );

        try {
            await target.send(
                'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
            );
        } finally {
            await guild.members.kick(
                target,
                'Member is not guilty, appeal closed.'
            );

            await interaction.reply(
                `Closed appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.tag}**`
                        : `<@${target}>`
                }. User is clean.`
            );
        }
    };

    if (!member.permissions.has('BAN_MEMBERS')) {
        await interaction.reply(
            'You do not have sufficient permission to execute this command.'
        );
        return;
    }

    {
        const executorRole = member.roles.highest;
        const targetRole = target.roles.highest;
        const clientRole = (
            guild.members.cache.get(
                (client.user as ClientUser).id
            ) as GuildMember
        ).roles.highest;

        if (executorRole.comparePositionTo(targetRole) < 0) {
            await interaction.reply(
                'You do not have sufficient permission to ban or unban this user.'
            );
            return;
        }

        if (clientRole.comparePositionTo(targetRole) <= 0) {
            await interaction.reply(
                'I do not have sufficient permission to execute this command.'
            );
            return;
        }
    }

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

    switch (commandName) {
        case 'accept':
            await accept();
            break;
        case 'reject':
            await reject();
            break;
        case 'falsebanned':
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
        ],
    },
];
