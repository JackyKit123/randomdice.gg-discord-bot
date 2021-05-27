import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import logMessage from '../../dev-commands/logMessage';
import cache, { MemberCurrency } from '../../helper/cache';
import cooldown from '../../helper/cooldown';
import { deleteCustomRole } from '../customRole';

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
const numberFormat = new Intl.NumberFormat();

function sortLeaderboard(
    guild: Discord.Guild,
    currencyList: MemberCurrency,
    type: 'default' | 'weekly' | 'gamble' = 'default'
): { name: string; value: string }[] {
    const sortFn = {
        default: ([, profileA], [, profileB]) =>
            typeof profileA.prestige !== 'undefined' &&
            profileB.prestige !== profileA.prestige
                ? (profileB.prestige || 0) - (profileA.prestige || 0)
                : profileB.balance - profileA.balance,
        weekly: ([, profileA], [, profileB]) =>
            (profileB.weeklyChat || 0) - (profileA.weeklyChat || 0),
        gamble: ([, profileA], [, profileB]) =>
            (profileB?.gamble?.gain || 0) -
            (profileB?.gamble?.lose || 0) -
            ((profileA?.gamble?.gain || 0) - (profileA?.gamble?.lose || 0)),
    } as {
        [key in typeof type]: (
            a: [string, MemberCurrency['key']],
            b: [string, MemberCurrency['key']]
        ) => number;
    };
    const value = {
        default: profile => profile.balance || 0,
        weekly: profile => profile.weeklyChat || 0,
        gamble: profile =>
            (profile?.gamble?.gain || 0) - (profile?.gamble?.lose || 0),
    } as {
        [key in typeof type]: (profile: MemberCurrency['key']) => number;
    };
    return Object.entries(currencyList)
        .sort(sortFn[type])
        .filter(([, profile]) => (type === 'gamble' ? !!profile.gamble : true))
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
            }\n<:dicecoin:839981846419079178> **__${numberFormat.format(
                value[type](profile)
            )}__**`,
        }));
}

async function resetWeekly(client: Discord.Client): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID || '804222694488932362'
    );
    if (!guild) {
        await logMessage(
            client,
            `Unable to get guild ${
                process.env.COMMUNITY_SERVER_ID || '804222694488932362'
            } when resetting weekly.`
        );
        return;
    }
    const channel = guild.channels.cache.get('805388492174655488');
    if (channel?.type !== 'text') {
        await logMessage(
            client,
            'Unable to get text channel 805388492174655488 when resetting weekly.'
        );
        return;
    }
    const database = firebase.app().database();
    const { weeklyWinners } = cache['discord_bot/community/currencyConfig'];
    const currencyList = cache['discord_bot/community/currency'];

    const sortedWeekly = sortLeaderboard(guild, currencyList, 'weekly');
    Object.keys(currencyList).forEach(id =>
        database.ref(`discord_bot/community/currency/${id}/weeklyChat`).set(0)
    );
    await (channel as Discord.TextChannel).send(
        '<@&804544088153391124>',
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
            .addFields(sortedWeekly.slice(0, 5))
    );
    const findUniques = new Map<string, true>();
    await Promise.all(
        weeklyWinners
            .concat(
                guild.roles.cache
                    .get('805388604791586826')
                    ?.members.map(m => m.id) || []
            )
            .map(async uid => {
                try {
                    const m = await guild.members.fetch(uid);
                    if (m && m.roles.cache.has('805388604791586826')) {
                        await m.roles.remove('805388604791586826');
                        findUniques.set(m.id, true);
                    }
                } catch {
                    // nothing
                }
            })
    );
    await (channel as Discord.TextChannel).send(
        `Remove <@&805388604791586826> from ${findUniques.size} members`
    );
    const weeklyList = await Promise.all(
        sortedWeekly.slice(0, 5).map(async ({ value }) => {
            const uid = (value.match(/^<@!(\d{18})>/) as RegExpMatchArray)[1];
            try {
                const m = await guild.members.fetch(uid);
                if (m) {
                    await m.roles.add('805388604791586826');
                    await (channel as Discord.TextChannel).send(
                        `Added <@&805388604791586826> to ${m}`
                    );
                }
                return uid;
            } catch {
                return '';
            }
        })
    );

    await database
        .ref('/discord_bot/community/currencyConfig/weeklyWinners')
        .set(weeklyList);
    // remove customRoles if no tier2 perks
    await Promise.all(
        weeklyWinners
            .concat(
                guild.roles.cache
                    .get('805388604791586826')
                    ?.members.map(m => m.id) || []
            )
            .map(async uid => {
                try {
                    const m = await guild.members.fetch(uid);
                    if (
                        !(
                            m.roles.cache.has('804513079319592980') ||
                            m.roles.cache.has('804496339794264085') ||
                            m.roles.cache.has('805817742081916988') ||
                            m.roles.cache.has('806896328255733780') ||
                            m.roles.cache.has('805388604791586826')
                        )
                    ) {
                        await deleteCustomRole(guild, database, m.id);
                    }
                } catch {
                    // nothing
                }
            })
    );
}

export function weeklyAutoReset(client: Discord.Client): void {
    const now = new Date();
    const dayNow = now.getUTCDay();
    const hourNow = now.getUTCHours();
    const minutesNow = now.getUTCMinutes();
    const secondsNow = now.getUTCSeconds();
    const msNow = now.getMilliseconds();

    const cd =
        1000 * 60 * 60 * 24 * 7 -
        1000 * 60 * 60 * 24 * dayNow -
        1000 * 60 * 60 * hourNow -
        1000 * 60 * minutesNow -
        1000 * secondsNow -
        msNow;
    setTimeout(() => resetWeekly(client), cd);
}

export default async function leaderboard(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { channel, guild, content, member } = message;

    if (!guild || !member) return;
    if (
        await cooldown(message, `!leaderboard`, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const [, arg, arg2] = content.split(' ');
    const isWeekly = /^(w|week|weekly)$/i.test(arg || '');
    const isGamble = /^(g|gamble)$/i.test(arg || '');
    const isReset = /^reset$/i.test(arg2 || '');
    const currencyList = cache['discord_bot/community/currency'];

    if (isReset && isWeekly) {
        if (member.hasPermission('MANAGE_GUILD')) {
            await resetWeekly(client);
        } else {
            await channel.send('You do not have permission to reset weekly');
        }
        return;
    }

    const fields = sortLeaderboard(
        guild,
        currencyList,
        // eslint-disable-next-line no-nested-ternary
        isWeekly ? 'weekly' : isGamble ? 'gamble' : 'default'
    );

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
                    // eslint-disable-next-line no-nested-ternary
                    isWeekly
                        ? 'Most Active People this week'
                        : isGamble
                        ? 'Biggest Gambler of all time'
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
