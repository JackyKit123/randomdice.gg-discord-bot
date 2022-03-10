import {
    ApplicationCommandChannelOptionData,
    ApplicationCommandData,
    ApplicationCommandNonOptionsData,
    CommandInteraction,
    GuildChannel,
    MessageEmbed,
    Role,
} from 'discord.js';
import { database } from 'register/firebase';
import cooldown from 'util/cooldown';
import cache from 'util/cache';

export default async function multiplierConfig(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, member, guild, commandName } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    const channel = options.getChannel('channel');
    const role = options.getRole('role');
    const multiArg = options.getInteger('multi');

    const subcommand = options.getSubcommand(true);
    switch (subcommand) {
        case 'view':
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Multiplier Settings')
                        .setAuthor({
                            name: 'randomdice.gg',
                            iconURL:
                                guild.iconURL({ dynamic: true }) ?? undefined,
                        })
                        .setColor('#800080')
                        .addField(
                            '**Roles**',
                            (
                                (
                                    await Promise.all(
                                        Object.entries(multiplier.roles).map(
                                            async ([id, multi]) => {
                                                const roleArg =
                                                    guild.roles.cache.get(id);
                                                if (!roleArg) {
                                                    await database
                                                        .ref(
                                                            `discord_bot/community/currencyConfig/multiplier/roles/${id}`
                                                        )
                                                        .set(null);
                                                    return false;
                                                }
                                                return { role: roleArg, multi };
                                            }
                                        )
                                    )
                                ).filter(notNull => notNull) as {
                                    role: Role;
                                    multi: number;
                                }[]
                            )
                                .sort(
                                    (a, b) => b.role.position - a.role.position
                                )
                                .map(m => `\`${m.multi}\` ${m.role}`)
                                .join('\n') || '*none*',
                            true
                        )
                        .addField(
                            '**Channels**',
                            (
                                (
                                    await Promise.all(
                                        Object.entries(multiplier.channels).map(
                                            ([id, multi]) => {
                                                const gchannel =
                                                    guild.channels.cache.get(
                                                        id
                                                    );
                                                if (!gchannel) {
                                                    database
                                                        .ref(
                                                            `discord_bot/community/currencyConfig/multiplier/channels/${id}`
                                                        )
                                                        .set(null);
                                                    return false;
                                                }
                                                return {
                                                    channel: gchannel,
                                                    multi,
                                                };
                                            }
                                        )
                                    )
                                ).filter(notNull => notNull) as {
                                    channel: GuildChannel;
                                    multi: number;
                                }[]
                            )
                                .sort((a, b) =>
                                    a.channel.parent?.position !==
                                    b.channel.parent?.position
                                        ? (a.channel.parent || a.channel)
                                              .position -
                                          (b.channel.parent || b.channel)
                                              .position
                                        : a.channel.position -
                                          b.channel.position
                                )
                                .map((m, i, arr) => {
                                    if (m.channel.parent) {
                                        let output = '';
                                        if (
                                            arr[i - 1]?.channel.parent?.id !==
                                            m.channel.parent.id
                                        ) {
                                            output += `┎${m.channel.parent}\n`;
                                        }
                                        if (
                                            arr[i + 1]?.channel.parent?.id !==
                                            m.channel.parent.id
                                        ) {
                                            output += `┕\`${m.multi}\` ${m.channel}`;
                                        } else {
                                            output += `┝\`${m.multi}\` ${m.channel}`;
                                        }
                                        return output;
                                    }
                                    return `${m.multi}\` ${m.channel}`;
                                })
                                .join('\n') || '*none*',
                            true
                        )
                        .addField(
                            '**Blacklisted**',
                            (
                                await Promise.all(
                                    multiplier.blacklisted?.map(async id =>
                                        // eslint-disable-next-line no-nested-ternary
                                        guild.roles.cache.has(id)
                                            ? `<@&${id}>`
                                            : guild.channels.cache.has(id)
                                            ? `<#${id}>`
                                            : database
                                                  .ref(
                                                      `discord_bot/community/currencyConfig/multiplier/blacklisted/`
                                                  )
                                                  .set(
                                                      multiplier.blacklisted.filter(
                                                          i => id !== i
                                                      )
                                                  )
                                    ) || []
                                )
                            ).join('\n') || '*none*',
                            true
                        ),
                ],
            });
            break;
        case 'set':
        case 'reset':
        case 'blacklist':
        case 'unblacklist': {
            if (!member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply(
                    'You do not have permission to configure the multiplier settings.'
                );
                return;
            }
            if (role && channel) {
                await interaction.reply(
                    'You cannot specify both a channel and a role to configure at the same time.'
                );
                return;
            }
            const target = role || channel;
            if (!target) {
                await interaction.reply(
                    'You must specify a channel or role to configure.'
                );
                return;
            }
            switch (subcommand) {
                case 'set':
                case 'reset': {
                    const isReset = multiArg === 0 || subcommand === 'reset';
                    const multiType =
                        target instanceof Role ? 'roles' : 'channels';
                    if (!multiArg && !isReset) {
                        await interaction.reply(
                            'You must specify a multiplier to set.'
                        );
                        return;
                    }

                    await database
                        .ref(
                            `discord_bot/community/currencyConfig/multiplier/${multiType}/${target.id}`
                        )
                        .set(isReset ? null : multiArg);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Success')
                                .setDescription(
                                    `Succefully ${
                                        isReset ? 'reset' : 'set'
                                    } ${target} to \`${
                                        isReset ? 0 : multiArg
                                    }\``
                                )
                                .setColor('#39ff14'),
                        ],
                    });
                    break;
                }
                case 'blacklist':
                    if (multiplier.blacklisted.includes(target.id)) {
                        await interaction.reply(
                            `${target} is already blacklisted.`
                        );
                        return;
                    }
                    await database
                        .ref(
                            `discord_bot/community/currencyConfig/multiplier/blacklisted/`
                        )
                        .set([...multiplier.blacklisted, target.id]);
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setDescription(`Blacklisted ${target}`)
                                .setColor('#000000'),
                        ],
                    });
                    break;
                case 'unblacklist':
                    if (!multiplier.blacklisted.includes(target.id)) {
                        await interaction.reply(
                            `${target} is not blacklisted.`
                        );
                        return;
                    }
                    await database
                        .ref(
                            `discord_bot/community/currencyConfig/multiplier/blacklisted/`
                        )
                        .set(
                            multiplier.blacklisted.filter(
                                id => id !== target.id
                            )
                        );
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                                .setDescription(`Unblacklisted ${target}`)
                                .setColor('#eeeeee'),
                        ],
                    });
                    break;
                default:
            }
            break;
        }
        default:
    }
}

const channelOrRoleOption: (
    | ApplicationCommandNonOptionsData
    | ApplicationCommandChannelOptionData
)[] = [
    {
        name: 'channel',
        description: 'The channel to configure the multiplier for.',
        type: 'CHANNEL',
    },
    {
        name: 'role',
        description: 'The role to configure the multiplier for.',
        type: 'ROLE',
    },
];

export const commandData: ApplicationCommandData = {
    name: 'multiplier',
    description: 'Command for the currency multiplier.',
    options: [
        {
            name: 'view',
            description: 'View the current multiplier settings.',
            type: 'SUB_COMMAND',
        },
        {
            name: 'set',
            description: 'Set the multiplier for a channel or role.',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'multi',
                    description: 'The multiplier to set.',
                    type: 'INTEGER',
                    required: true,
                },
                ...channelOrRoleOption,
            ],
        },
        {
            name: 'reset',
            description: 'Reset the multiplier for a channel or role.',
            type: 'SUB_COMMAND',
            options: channelOrRoleOption,
        },
        {
            name: 'blacklist',
            description: 'Blacklist a channel or role from the multiplier.',
            type: 'SUB_COMMAND',
            options: channelOrRoleOption,
        },
        {
            name: 'unblacklist',
            description: 'Unblacklist a channel or role from the multiplier.',
            type: 'SUB_COMMAND',
            options: channelOrRoleOption,
        },
    ],
};
