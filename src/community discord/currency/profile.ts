import Discord, {
    CommandInteraction,
    DiscordAPIError,
    Message,
    MessageActionRow,
    MessageButton,
    UserContextMenuInteraction,
} from 'discord.js';
import moment from 'moment';
import cache from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import fetchMention from 'util/fetchMention';
import { reply } from 'util/typesafeReply';
import { coinDice, nullDice } from 'config/emojiId';
import { prestigeRoles } from 'config/roleId';
import getBalance from './balance';
import { duplicatedRoleMulti } from './chatCoins';

export default async function Profile(
    input: Message | CommandInteraction | UserContextMenuInteraction
): Promise<void> {
    const { channel, guild, client } = input;
    const numberFormat = new Intl.NumberFormat();

    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    if (!member || !guild || !channel) return;

    let target = member;
    if (input instanceof Message) {
        const memberArg = input.content.split(' ')[1];
        target =
            (await fetchMention(memberArg, guild, {
                content: input.content,
                mentionIndex: 1,
            })) || member;
    } else {
        target =
            guild.members.cache.get(
                input.options.getUser('member')?.id ?? member.id
            ) ?? member;
    }

    const balance = await getBalance(input, 'emit new member', target);
    if (balance === false) return;

    const currentPrestigeLevel = Number(
        Object.entries(prestigeRoles)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([, roleId]) => target.roles.cache.has(roleId))?.[0] || 0
    );

    const getPrestigeIcon = async (roleId: string) => {
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
        target.roles.cache
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

    const currency = cache['discord_bot/community/currency'];
    const profile = currency[target.id];
    const emoji = cache['discord_bot/emoji'];
    const { dice } = cache;
    const [CommonDice, RareDice, UniqueDice, LegendaryDice] = [
        'Common',
        'Rare',
        'Unique',
        'Legendary',
    ].map(rarity => dice.filter(d => d.rarity === rarity));
    const nextPrestigeLevel = currentPrestigeLevel + 1;
    const progress = balance / (nextPrestigeLevel * 250000);
    const embed = new Discord.MessageEmbed()
        .setAuthor({
            name: `${target.displayName}'s Profile`,
            iconURL: member.displayAvatarURL({
                dynamic: true,
            }),
        })
        .setColor(
            // eslint-disable-next-line no-nested-ternary
            target.displayHexColor
                ? // eslint-disable-next-line no-nested-ternary
                  target.displayHexColor === '#000000'
                    ? '#010101'
                    : target.displayHexColor === '#ffffff'
                    ? '#fefefe'
                    : target.displayHexColor
                : '#000000'
        );

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    const channelMulti = multiplier.channels[channel.id] || 0;
    let roleMulti = 0;
    target.roles.cache.forEach(role => {
        roleMulti += multiplier.roles[role.id] || 0;
    });
    const dupedMulti = duplicatedRoleMulti(target);

    const generalProfile = new Discord.MessageEmbed(embed)
        .setTitle('General Profile')
        .setDescription(
            `${
                profile.prestige > 0
                    ? `**${guild.roles.cache
                          .get(prestigeRoles[profile.prestige])
                          ?.name.toUpperCase()}** ${await getPrestigeIcon(
                          prestigeRoles[profile.prestige]
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
            `\`${numberFormat.format(profile.weeklyChat || 0)}\``,
            true
        )
        .addField(
            'Your Chat Multi',
            `\`+${roleMulti}\` from your Roles\n\`+${dupedMulti}\` from duplicated perks\n\`+${channelMulti}\` in <#${
                channel.id
            }>\n\`+${channelMulti + roleMulti + dupedMulti + 1}\` in Total`,
            true
        )
        .addField(
            'Prestige Progress',
            currentPrestigeLevel === 10
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
                    .findIndex(([uid]) => uid === target.id) + 1
            }** in ${coinDice} wealth\n**#${
                Object.entries(currency)
                    .sort(
                        ([, profileA], [, profileB]) =>
                            (profileB.weeklyChat || 0) -
                            (profileA.weeklyChat || 0)
                    )
                    .findIndex(([uid]) => uid === target.id) + 1
            }** in weekly rank`,
            true
        )
        .setFooter(
            'Showing page GENERAL of "general, cooldown, gamble, dice drawn", click the buttons to flip pages'
        );

    const cooldownProfile = new Discord.MessageEmbed(embed)
        .setTitle('Cooldown')
        .setDescription(
            `${
                profile.dailyStreak && profile.dailyStreak > 1
                    ? `🔥 **${profile.dailyStreak}** Daily Streak\n`
                    : ''
            }**Hourly**\n${cooldown(
                profile.hourly || 0,
                'hourly'
            )}\n**Daily**\n${cooldown(
                profile.daily || 0,
                'daily'
            )}\n**Weekly**\n${cooldown(
                profile.weekly || 0,
                'weekly'
            )}\n**Monthly**\n${cooldown(
                profile.monthly || 0,
                'monthly'
            )}\n**Yearly**\n${cooldown(profile.yearly || 0, 'yearly')}`
        )
        .setFooter(
            'Showing page PROFILE of "general, cooldown, gamble, dice drawn", click the buttons to flip pages'
        );

    const gambleProfile = new Discord.MessageEmbed(embed)
        .setTitle("Gamble's Profile")
        .setDescription(
            `Total won: ${coinDice} ${numberFormat.format(
                profile.gamble?.gain || 0
            )}\nTotal lose: ${coinDice} ${numberFormat.format(
                profile.gamble?.lose || 0
            )}\nTotal earning: ${coinDice} ${numberFormat.format(
                (profile.gamble?.gain || 0) - (profile.gamble?.lose || 0)
            )}\n`
        )
        .setFooter(
            'Showing page GAMBLE of "general, cooldown, gamble, dice drawn", click the buttons to flip pages'
        );

    const diceDrawnProfile = embed
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
                                            profile.diceDrawn?.[d.id] || 0
                                        }`
                                )
                                .join('  '),
                        }))
                )
                .flat()
        )
        .setFooter(
            'Showing page DICE DRAWN of "general, cooldown, gamble, dice drawn", click the buttons to flip pages'
        );

    let components = [
        new MessageActionRow().addComponents(
            ['👤', '⏲️', '🎰', nullDice, '❌'].map((button, i) =>
                new MessageButton()
                    .setCustomId(button)
                    .setEmoji(button)
                    .setDisabled(i === 0)
                    .setStyle(
                        // eslint-disable-next-line no-nested-ternary
                        i === 0
                            ? 'SECONDARY'
                            : button === '❌'
                            ? 'DANGER'
                            : 'PRIMARY'
                    )
            )
        ),
    ];
    const sentMessage = await reply(input, {
        embeds: [generalProfile],
        components,
    });

    const collector = sentMessage.createMessageComponentCollector({
        filter: ({ user }) => user.id === member.id,
        time: 60 * 1000,
    });

    collector.on('collect', async interaction => {
        try {
            components = [
                new MessageActionRow().addComponents(
                    ['👤', '⏲️', '🎰', nullDice, '❌'].map(button =>
                        new MessageButton()
                            .setCustomId(button)
                            .setEmoji(button)
                            .setDisabled(button === interaction.customId)
                            .setStyle(
                                // eslint-disable-next-line no-nested-ternary
                                button === interaction.customId
                                    ? 'SECONDARY'
                                    : button === '❌'
                                    ? 'DANGER'
                                    : 'PRIMARY'
                            )
                    )
                ),
            ];
            switch (interaction.customId) {
                case '👤':
                    await interaction.update({
                        embeds: [generalProfile],
                        components,
                    });
                    break;
                case '⏲️':
                    await interaction.update({
                        embeds: [cooldownProfile],
                        components,
                    });
                    break;
                case '🎰':
                    await interaction.update({
                        embeds: [gambleProfile],
                        components,
                    });
                    break;
                case nullDice:
                    await interaction.update({
                        embeds: [diceDrawnProfile],
                        components,
                    });
                    break;
                case '❌':
                    collector.stop();
                    break;
                default:
            }
        } catch {
            // message prob got deleted
        }
    });

    collector.on('end', async () => {
        try {
            await sentMessage.delete();
        } catch (err) {
            if ((err as DiscordAPIError).message !== 'Unknown Message')
                throw err;
        }
    });
}
