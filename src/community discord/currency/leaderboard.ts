import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import cache from '../../helper/cache';
import cooldown from '../../helper/cooldown';

const prestigeRoleIds = [
    '806312627877838878',
    '806896328255733780',
    '806896441947324416',
    '809142950117245029',
    '809142956715671572',
    '809142968434950201',
    '809143362938339338',
    '809143374555774997',
    '809143390791925780',
    '809143588105486346',
];

export default async function leaderboard(
    message: Discord.Message
): Promise<void> {
    const { channel, guild, content, member } = message;
    const database = firebase.app().database();
    const numberFormat = new Intl.NumberFormat();
    if (!guild || !member) return;
    if (
        await cooldown(message, `!leaderboard`, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const isWeekly = /^(w|week|weekly)$/i.test(content.split(' ')[1] || '');
    const isReset = /^reset$/i.test(content.split(' ')[2] || '');
    const currencyList = cache['discord_bot/community/currency'];

    if (isReset && isWeekly) {
        const { weeklyWinners } = cache['discord_bot/community/currencyConfig'];
        if (member.hasPermission('MANAGE_GUILD')) {
            const sortedWeekly = Object.entries(currencyList).sort(
                ([, profileA], [, profileB]) =>
                    (profileB.weeklyChat || 0) - (profileA.weeklyChat || 0)
            );
            Object.keys(currencyList).forEach(id =>
                database
                    .ref(`discord_bot/community/currency/${id}/weeklyChat`)
                    .set(0)
            );
            await channel.send(
                new Discord.MessageEmbed()
                    .setColor('#6ba4a5')
                    .setThumbnail(
                        'https://cdn.discordapp.com/emojis/813149167585067008.png?v=1'
                    )
                    .setTitle(`Top 5 Weekly Winners`)
                    .setAuthor(
                        'Randomdice.gg Server',
                        guild.iconURL({
                            dynamic: true,
                        }) ?? undefined,
                        `https://discord.gg/randomdice`
                    )
                    .addFields(
                        sortedWeekly.slice(0, 5).map(([uid, profile], i) => ({
                            name: `#${i + 1}`,
                            value: `<@!${uid}> ${
                                profile.prestige > 0
                                    ? `***${
                                          guild.roles.cache.get(
                                              prestigeRoleIds[
                                                  profile.prestige - 1
                                              ]
                                          )?.name
                                      }***`
                                    : ''
                            }\n<:Dice_TierX_Coin:813149167585067008> **__${numberFormat.format(
                                profile.weeklyChat || 0
                            )}__**`,
                        }))
                    )
            );
            let removed = 0;
            await Promise.all(
                weeklyWinners
                    .concat(
                        guild.roles.cache
                            .get('805388604791586826')
                            ?.members.map(m => m.id) || []
                    )
                    .map(async uid => {
                        const m = await guild.members.fetch(uid);
                        if (m && m.roles.cache.has('805388604791586826')) {
                            await m.roles.remove('805388604791586826');
                            removed += 1;
                        }
                    })
            );
            await channel.send(
                `Remove <@&805388604791586826> from ${removed} members`
            );
            const weeklyList = await Promise.all(
                sortedWeekly.slice(0, 5).map(async ([uid]) => {
                    const m = await guild.members.fetch(uid);
                    if (m) {
                        await m.roles.add('805388604791586826');
                        await channel.send(
                            `Added <@&805388604791586826> to ${m}`
                        );
                    }
                    return uid;
                })
            );
            await database
                .ref('/discord_bot/community/currencyConfig/weeklyWinners')
                .set(weeklyList);
            return;
        }
        await channel.send('You do not have permission to reset weekly');
        return;
    }

    const fields = Object.entries(currencyList)
        .sort(([, profileA], [, profileB]) =>
            // eslint-disable-next-line no-nested-ternary
            isWeekly
                ? (profileB.weeklyChat || 0) - (profileA.weeklyChat || 0)
                : typeof profileA.prestige !== 'undefined' &&
                  profileB.prestige !== profileA.prestige
                ? (profileB.prestige || 0) - (profileA.prestige || 0)
                : profileB.balance - profileA.balance
        )
        .map(([uid, profile], i) => ({
            name: `#${i + 1}`,
            value: `<@!${uid}> ${
                profile.prestige > 0
                    ? `***${
                          guild.roles.cache.get(
                              prestigeRoleIds[profile.prestige - 1]
                          )?.name
                      }***`
                    : ''
            }\n<:Dice_TierX_Coin:813149167585067008> **__${numberFormat.format(
                isWeekly ? profile.weeklyChat || 0 : profile.balance
            )}__**`,
        }));

    const pageNumbers = Math.ceil(fields.length / 10);
    let currentPage = 0;
    if (currentPage > pageNumbers) {
        currentPage = pageNumbers - 1;
    }

    const embeds = Array(pageNumbers)
        .fill('')
        .map((_, i) =>
            new Discord.MessageEmbed()
                .setColor('#6ba4a5')
                .setThumbnail(
                    'https://cdn.discordapp.com/emojis/813149167585067008.png?v=1'
                )
                .setTitle(
                    isWeekly
                        ? 'Most Active People this week'
                        : `Richest People in the Server`
                )
                .setAuthor(
                    'Randomdice.gg Server',
                    guild.iconURL({
                        dynamic: true,
                    }) ?? undefined,
                    `https://discord.gg/randomdice`
                )
                .setDescription(
                    `Showing page ${
                        i + 1
                    } of ${pageNumbers}. Use the message reaction to flip page.`
                )
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setTimestamp()
        );
    const sentMessage = await channel.send(embeds[currentPage]);
    if (pageNumbers <= 1) {
        return;
    }
    await sentMessage.react('⏪');
    await sentMessage.react('◀️');
    await sentMessage.react('▶️');
    await sentMessage.react('⏩');
    const collector = sentMessage.createReactionCollector(
        (reaction, user) =>
            ['⏪', '◀️', '▶️', '⏩'].includes(reaction.emoji.name) &&
            user.id === member.id,
        {
            time: 180000,
        }
    );

    collector.on('collect', async (reaction, user) => {
        if (reaction.emoji.name === '⏪') {
            currentPage = 0;
        }
        if (reaction.emoji.name === '◀️' && currentPage > 0) {
            currentPage -= 1;
        }
        if (reaction.emoji.name === '▶️' && currentPage < pageNumbers - 1) {
            currentPage += 1;
        }
        if (reaction.emoji.name === '⏩') {
            currentPage = pageNumbers - 1;
        }
        if (sentMessage.editable) await sentMessage.edit(embeds[currentPage]);
        await reaction.users.remove(user.id);
    });

    collector.on('end', async () => {
        await Promise.all(
            [await sentMessage.reactions.removeAll()].concat(
                sentMessage.editable
                    ? [
                          await sentMessage.edit(
                              `The reaction commands has expired`,
                              embeds[currentPage]
                          ),
                      ]
                    : []
            )
        );
    });
}
