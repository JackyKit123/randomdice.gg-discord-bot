import Discord, {
    DiscordAPIError,
    MessageActionRow,
    MessageButton,
} from 'discord.js';
import moment from 'moment';
import getBalance from 'util/getBalance';
import cache from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import fetchMention from 'util/fetchMention';
import { duplicatedRoleMulti } from './chatCoins';

export default async function Profile(message: Discord.Message): Promise<void> {
    const { member, channel, guild, content, client } = message;
    const numberFormat = new Intl.NumberFormat();

    if (!member || !guild) return;

    const memberArg = content.split(' ')[1];
    const target =
        (await fetchMention(memberArg, guild, {
            content,
            mentionIndex: 1,
        })) || member;

    const balance = await getBalance(message, 'emit new member', target);
    if (balance === false) return;

    const prestigeLevels: { [level: number]: string } = {
        1: '806312627877838878',
        2: '806896328255733780',
        3: '806896441947324416',
        4: '809142950117245029',
        5: '809142956715671572',
        6: '809142968434950201',
        7: '809143362938339338',
        8: '809143374555774997',
        9: '809143390791925780',
        10: '809143588105486346',
    };
    const currentPrestigeLevel = Number(
        Object.entries(prestigeLevels)
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
        .setAuthor(
            `${target.displayName}'s Profile`,
            target.user.avatarURL({ dynamic: true }) ??
                target.user.defaultAvatarURL
        )
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
                          .get(prestigeLevels[profile.prestige])
                          ?.name.toUpperCase()}** ${await getPrestigeIcon(
                          prestigeLevels[profile.prestige]
                      )}`
                    : ' '
            }${getOtherBadges() ? `\n\n${getOtherBadges()}\n‎` : ''}`
        )
        .addField(
            'Balance',
            `<:dicecoin:839981846419079178> **${numberFormat.format(
                balance
            )}**`,
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
            }** in <:dicecoin:839981846419079178> wealth\n**#${
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
            `Total won: <:dicecoin:839981846419079178> ${numberFormat.format(
                profile.gamble?.gain || 0
            )}\nTotal lose: <:dicecoin:839981846419079178> ${numberFormat.format(
                profile.gamble?.lose || 0
            )}\nTotal earning: <:dicecoin:839981846419079178> ${numberFormat.format(
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
            [
                '👤',
                '⏲️',
                '🎰',
                '<:Dice_TierX_Null:807019807312183366>',
                '❌',
            ].map((button, i) =>
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
    const sentMessage = await channel.send({
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
                    [
                        '👤',
                        '⏲️',
                        '🎰',
                        '<:Dice_TierX_Null:807019807312183366>',
                        '❌',
                    ].map(button =>
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
                case '<:Dice_TierX_Null:807019807312183366>':
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
