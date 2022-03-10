import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    UserContextMenuInteraction,
} from 'discord.js';
import moment from 'moment';
import cache, { MemberCurrencyProfile } from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import { coinDice, nullDice } from 'config/emojiId';
import { prestigeRoles } from 'config/roleId';
import { getPrestigeLevel } from 'community discord/util/checkPrestigeLevel';
import { getBalance } from './balance';
import { duplicatedRoleMulti } from './chatCoins';

const numberFormat = new Intl.NumberFormat();

const getDefaultEmbed = (member: GuildMember) =>
    new MessageEmbed()
        .setAuthor({
            name: `${member.displayName}'s Profile`,
            iconURL: member.displayAvatarURL({
                dynamic: true,
            }),
        })
        .setColor(
            // eslint-disable-next-line no-nested-ternary
            member.displayColor
                ? // eslint-disable-next-line no-nested-ternary
                  member.displayHexColor === '#000000'
                    ? '#010101'
                    : member.displayHexColor === '#ffffff'
                    ? '#fefefe'
                    : member.displayHexColor
                : '#000000'
        );

const getGeneralProfilePage = (
    member: GuildMember,
    balance: number,
    channel: GuildTextBasedChannel | null
) => {
    const { guild, client } = member;

    const getPrestigeIcon = (roleId: string) => {
        const role = guild.roles.cache.get(roleId);
        const devServer = client.guilds.cache.get(
            process.env.DEV_SERVER_ID ?? ''
        );
        if (!role || !devServer) return '';
        const prestigeRoleName = role.name;
        const prestigeRoleIconEmoji = devServer.emojis.cache.find(
            emoji => emoji.name === prestigeRoleName.replace(' ', '_')
        );
        return prestigeRoleIconEmoji?.toString();
    };

    const getOtherBadges = (): string =>
        member.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => {
                const devServer = client.guilds.cache.get(
                    process.env.DEV_SERVER_ID ?? ''
                );
                if (!devServer) return '';
                const roleName = role.name;
                if (roleName.includes('Prestige')) return '';
                const roleIconEmoji = devServer.emojis.cache.find(
                    emoji =>
                        emoji.name ===
                        roleName.replaceAll(' ', '_').replaceAll('$', '')
                );
                return roleIconEmoji?.toString();
            })
            .filter(Boolean)
            .join('　');

    const currency = cache['discord_bot/community/currency'];
    const memberProfile = currency[member.id];
    const prestigeLevel = getPrestigeLevel(member);
    const nextPrestigeLevel = prestigeLevel + 1;
    const progress = balance / (nextPrestigeLevel * 250000);

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    const channelMulti = channel ? multiplier.channels[channel.id] || 0 : 0;
    let roleMulti = 0;
    member.roles.cache.forEach(role => {
        roleMulti += multiplier.roles[role.id] || 0;
    });
    const dupedMulti = duplicatedRoleMulti(member);
    return getDefaultEmbed(member)
        .setTitle('General Profile')
        .setDescription(
            `${
                memberProfile.prestige > 0
                    ? `**${guild.roles.cache
                          .get(prestigeRoles[memberProfile.prestige])
                          ?.name.toUpperCase()}** ${getPrestigeIcon(
                          prestigeRoles[memberProfile.prestige]
                      )}`
                    : ' '
            }${getOtherBadges() ? `\n\n${getOtherBadges()}\n‎` : ''}`
        )
        .addField(
            'Balance',
            `${coinDice} **${numberFormat.format(balance)}**`,
            true
        )
        .addField(
            'Weekly Chat Points',
            `\`${numberFormat.format(memberProfile.weeklyChat || 0)}\``,
            true
        )
        .addField(
            'Your Chat Multi',
            `\`+${roleMulti}\` from your Roles\n\`+${dupedMulti}\` from duplicated perks\n${
                channel
                    ? `\`+${channelMulti}\` in <#${channel.id}>`
                    : '`+unknown` in #unknown-channel???'
            }\n\`+${channelMulti + roleMulti + dupedMulti + 1}\` in Total`,
            true
        )
        .addField(
            'Prestige Progress',
            prestigeLevel === 10
                ? '**Max Prestige**'
                : `${'■'.repeat(
                      Math.max(0, Math.floor(progress * 10))
                  )}${'□'.repeat(
                      Math.min(Math.max(10 - Math.floor(progress * 10), 0), 10)
                  )}(${Math.floor(progress * 1000) / 10}%)`
        )
        .addField(
            'Your Server Rank',
            `**#${
                Object.entries(currency)
                    .filter(([uid]) => uid !== '195174308052467712')
                    .sort(
                        ([, profileA], [, profileB]) =>
                            profileB.balance - profileA.balance
                    )
                    .findIndex(([uid]) => uid === member.id) + 1
            }** in ${coinDice} wealth\n**#${
                Object.entries(currency)
                    .sort(
                        ([, profileA], [, profileB]) =>
                            (profileB.weeklyChat || 0) -
                            (profileA.weeklyChat || 0)
                    )
                    .findIndex(([uid]) => uid === member.id) + 1
            }** in weekly rank`,
            true
        )
        .setFooter({
            text: 'Showing page GENERAL, click the buttons to flip pages',
        });
};

const getCooldownPage = (
    member: GuildMember,
    memberProfile: MemberCurrencyProfile
) => {
    function cooldown(
        timestamp = 0,
        mode: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
    ): string {
        let period = 1000 * 60;
        let endOf: moment.Moment = moment();
        switch (mode) {
            case 'hourly':
                period *= 60;
                endOf = moment().endOf('hour');
                break;
            case 'daily':
                period *= 60 * 24;
                endOf = moment().endOf('day');
                break;
            case 'weekly':
                period *= 60 * 24 * 7;
                endOf = moment().endOf('week');
                break;
            case 'monthly':
                period *= 60 * 24 * moment().daysInMonth();
                endOf = moment().endOf('month');
                break;
            case 'yearly':
                period *= 60 * 24 * (moment().isLeapYear() ? 366 : 365);
                endOf = moment().endOf('year');
                break;
            default:
        }

        return endOf.diff(timestamp) < period
            ? `⏲️ \`${parseMsIntoReadableText(endOf.diff(moment()))}\` Cooldown`
            : '✅ Ready to Claim';
    }

    return getDefaultEmbed(member)
        .setTitle('Cooldown')
        .setDescription(
            `${
                memberProfile.dailyStreak && memberProfile.dailyStreak > 1
                    ? `🔥 **${memberProfile.dailyStreak}** Daily Streak\n`
                    : ''
            }**Hourly**\n${cooldown(
                memberProfile.hourly || 0,
                'hourly'
            )}\n**Daily**\n${cooldown(
                memberProfile.daily || 0,
                'daily'
            )}\n**Weekly**\n${cooldown(
                memberProfile.weekly || 0,
                'weekly'
            )}\n**Monthly**\n${cooldown(
                memberProfile.monthly || 0,
                'monthly'
            )}\n**Yearly**\n${cooldown(memberProfile.yearly || 0, 'yearly')}`
        )
        .setFooter({
            text: 'Showing page PROFILE, click the buttons to flip pages',
        });
};

const getGambleProfilePage = (
    member: GuildMember,
    memberProfile: MemberCurrencyProfile
) =>
    getDefaultEmbed(member)
        .setTitle('Gambling Profile')
        .setDescription(
            `Total won: ${coinDice} ${numberFormat.format(
                memberProfile.gamble?.gain || 0
            )}\nTotal lose: ${coinDice} ${numberFormat.format(
                memberProfile.gamble?.lose || 0
            )}\nTotal earning: ${coinDice} ${numberFormat.format(
                (memberProfile.gamble?.gain || 0) -
                    (memberProfile.gamble?.lose || 0)
            )}\n`
        )
        .setFooter({
            text: 'Showing page GAMBLE, click the buttons to flip pages',
        });

const getDDProfilePage = (
    member: GuildMember,
    memberProfile: MemberCurrencyProfile
) => {
    const { dice } = cache;
    const emoji = cache['discord_bot/emoji'];
    const [CommonDice, RareDice, UniqueDice, LegendaryDice] = [
        'Common',
        'Rare',
        'Unique',
        'Legendary',
    ].map(rarity => dice.filter(d => d.rarity === rarity));
    return getDefaultEmbed(member)
        .setTitle('Dice Drawn from dd')
        .addFields(
            [CommonDice, RareDice, UniqueDice, LegendaryDice]
                .map(diceList =>
                    new Array(Math.ceil(diceList.length / 8))
                        .fill(' ')
                        .map((_, i) => ({
                            name: i === 0 ? `${diceList[0].rarity} Dice` : '‎',
                            value: diceList
                                .slice(i * 8, i * 8 + 8)
                                .map(
                                    d =>
                                        `${emoji[d.id]} x${
                                            memberProfile.diceDrawn?.[d.id] || 0
                                        }`
                                )
                                .join('  '),
                        }))
                )
                .flat()
        )
        .setFooter({
            text: 'Showing page DICE DRAWN, click the buttons to flip pages',
        });
};

const getProfileButtons = (
    disableButton: (button: string, index: number) => boolean
) => [
    new MessageActionRow().addComponents(
        ['👤', '⏲️', '🎰', nullDice, '❌'].map((button, i) =>
            new MessageButton()
                .setCustomId(`profile-${button}`)
                .setEmoji(button)
                .setDisabled(disableButton(button, i))
                .setStyle(
                    // eslint-disable-next-line no-nested-ternary
                    disableButton(button, i)
                        ? 'SECONDARY'
                        : button === '❌'
                        ? 'DANGER'
                        : 'PRIMARY'
                )
        )
    ),
];

const sentProfileMessages = new Map<
    Message,
    {
        member: GuildMember;
        target: GuildMember;
    }
>();

export default async function profile(
    interaction: CommandInteraction | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, guild, options, member } = interaction;

    if (!member || !guild || !channel) return;

    const target = options.getMember('user') ?? member;

    const balance = await getBalance(interaction, false, target);
    if (balance === null) return;

    const sentMessage = await interaction.reply({
        embeds: [getGeneralProfilePage(target, balance, channel)],
        components: getProfileButtons((_, i) => i === 0),
        fetchReply: true,
    });
    sentProfileMessages.set(sentMessage, { member, target });
}

export async function profileButtons(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { customId, message, user, channel } = interaction;
    const components = getProfileButtons(
        button => `profile-${button}` === customId
    );
    const sentProfileMessage = sentProfileMessages.get(message);
    if (!sentProfileMessage) return;
    const { member, target } = sentProfileMessage;
    if (member.id !== user.id) {
        await interaction.reply({
            content:
                'You cannot use this button, you did not request this profile.',
            ephemeral: true,
        });
        return;
    }

    const memberProfile = cache['discord_bot/community/currency'][target.id];

    switch (interaction.customId) {
        case 'profile-👤':
            await interaction.update({
                embeds: [
                    getGeneralProfilePage(
                        target,
                        memberProfile.balance,
                        channel
                    ),
                ],
                components,
            });
            break;
        case 'profile-⏲️':
            await interaction.update({
                embeds: [getCooldownPage(target, memberProfile)],
                components,
            });
            break;
        case 'profile-🎰':
            await interaction.update({
                embeds: [getGambleProfilePage(target, memberProfile)],
                components,
            });
            break;
        case `profile-${nullDice}`:
            await interaction.update({
                embeds: [getDDProfilePage(target, memberProfile)],
                components,
            });
            break;
        case 'profile-❌':
            await message.delete();
            break;
        default:
    }
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'profile',
        description: "Show your or another user's profile.",
        options: [
            {
                name: 'user',
                description: 'The user to show to the profile of.',
                type: 6,
            },
        ],
    },
    {
        name: 'Show Profile',
        type: 'USER',
    },
];
