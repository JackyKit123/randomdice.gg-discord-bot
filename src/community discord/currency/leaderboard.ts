import {
    ApplicationCommandData,
    Client,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import { database } from 'register/firebase';
import logMessage from 'util/logMessage';
import cache, { MemberCurrency } from 'util/cache';
import cooldown from 'util/cooldown';
import getPaginationComponents from 'util/paginationButtons';
import channelIds from 'config/channelIds';
import roleIds, { tier2RoleIds } from 'config/roleId';
import { coinDice } from 'config/emojiId';
import checkPermission from 'community discord/util/checkPermissions';
import { promisify } from 'util';
import { deleteCustomRole } from '../customRole';

const wait = promisify(setTimeout);
const numberFormat = new Intl.NumberFormat();

function sortLeaderboard(
    currencyList: MemberCurrency,
    type: 'default' | 'weekly' | 'gamble' = 'default'
): { name: string; value: string }[] {
    const sortFn: {
        [key in typeof type]: (
            a: [string, MemberCurrency['key']],
            b: [string, MemberCurrency['key']]
        ) => number;
    } = {
        default: ([, profileA], [, profileB]) =>
            profileB.balance - profileA.balance,
        weekly: ([, profileA], [, profileB]) =>
            (profileB.weeklyChat || 0) - (profileA.weeklyChat || 0),
        gamble: ([, profileA], [, profileB]) =>
            (profileB?.gamble?.gain || 0) -
            (profileB?.gamble?.lose || 0) -
            ((profileA?.gamble?.gain || 0) - (profileA?.gamble?.lose || 0)),
    };
    const value: {
        [key in typeof type]: (profile: MemberCurrency['key']) => number;
    } = {
        default: profile => profile.balance || 0,
        weekly: profile => profile.weeklyChat || 0,
        gamble: profile =>
            (profile?.gamble?.gain || 0) - (profile?.gamble?.lose || 0),
    };
    return Object.entries(currencyList)
        .sort(sortFn[type])
        .filter(([id, profile]) => {
            switch (type) {
                case 'gamble':
                    return !!profile.gamble;
                case 'default':
                    return id !== '195174308052467712';
                default:
                    return true;
            }
        })
        .map(([uid, profile], i) => ({
            name: `#${i + 1}`,
            value: `<@!${uid}> \n${coinDice} **__${numberFormat.format(
                value[type](profile)
            )}__**`,
        }));
}

async function resetWeekly(client: Client): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    if (!guild) {
        await logMessage(
            client,
            'warning',
            `Unable to get guild ${
                process.env.COMMUNITY_SERVER_ID ?? ''
            } when resetting weekly.`
        );
        return;
    }
    const channel = guild.channels.cache.get(channelIds['weekly-top-5']);
    if (!channel?.isText()) {
        await logMessage(
            client,
            'warning',
            'Unable to get text channel weekly-top-5 when resetting weekly.'
        );
        return;
    }

    const { weeklyWinners } = cache['discord_bot/community/currencyConfig'];
    const currencyList = cache['discord_bot/community/currency'];

    const sortedWeekly = sortLeaderboard(currencyList, 'weekly');
    Object.keys(currencyList).forEach(id =>
        database.ref(`discord_bot/community/currency/${id}/weeklyChat`).set(0)
    );
    await channel.send({
        content: roleIds['Server Event Ping'],
        embeds: [
            new MessageEmbed()
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
                .addFields(sortedWeekly.slice(0, 5)),
        ],
    });
    const findUniques = new Map<string, true>();
    await Promise.all(
        weeklyWinners
            .concat(
                guild.roles.cache
                    .get(roleIds['Weekly Top 5'] ?? '')
                    ?.members.map(m => m.id) || []
            )
            .map(async uid => {
                try {
                    const m = await guild.members.fetch(uid);
                    if (m && m.roles.cache.has(roleIds['Weekly Top 5'])) {
                        await m.roles.remove(roleIds['Weekly Top 5']);
                        findUniques.set(m.id, true);
                    }
                } catch {
                    // nothing
                }
            })
    );
    await channel.send(
        `Remove <@&${roleIds['Weekly Top 5']}> from ${findUniques.size} members`
    );
    const weeklyList = await Promise.all(
        sortedWeekly.slice(0, 5).map(async ({ value }) => {
            const uid = value.match(/^<@!(\d{18})>/)?.[1];
            if (!uid) return '';
            try {
                const m = await guild.members.fetch(uid);
                if (m) {
                    await m.roles.add(roleIds['Weekly Top 5']);
                    await channel.send(
                        `Added <@&${roleIds['Weekly Top 5']}> to ${m}`
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
                    .get(roleIds['Weekly Top 5'])
                    ?.members.map(m => m.id) || []
            )
            .map(async uid => {
                try {
                    const m = await guild.members.fetch(uid);
                    if (!m.roles.cache.hasAny(...tier2RoleIds)) {
                        await deleteCustomRole(
                            guild,
                            m.id,
                            `${m.user.tag} lost weekly top 5 role and does not have another tier 2 perk`
                        );
                    }
                } catch {
                    // nothing
                }
            })
    );
}

export async function weeklyAutoReset(client: Client): Promise<void> {
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
    await wait(cd);
    await resetWeekly(client);
}

export async function resetLeaderboard(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!(await checkPermission(interaction, roleIds.Admin))) return;
    await resetWeekly(interaction.client);
    await interaction.reply('Weekly leaderboard has been reset.');
}

export default async function leaderboard(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { guild, commandName, member, options } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const isWeekly = options.getString('type') === 'weekly';
    const isGamble = options.getString('type') === 'gamble';
    const currencyList = cache['discord_bot/community/currency'];

    const fields = sortLeaderboard(
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
            new MessageEmbed()
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
                .setAuthor({
                    name: 'Randomdice.gg Server',
                    iconURL:
                        guild.iconURL({
                            dynamic: true,
                        }) ?? undefined,
                    url: 'https://discord.gg/randomdice',
                })
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setTimestamp()
                .setFooter({ text: `Showing page ${i + 1} of ${pageNumbers}.` })
        );

    const { components, collectorHandler } = getPaginationComponents(
        pageNumbers,
        currentPage
    );
    const sentMessage = await interaction.reply({
        embeds: [embeds[currentPage]],
        components,
        fetchReply: true,
    });

    collectorHandler(sentMessage, member.user, embeds);
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'leaderboard',
        description: 'View the leaderboard',
        options: [
            {
                name: 'type',
                description: 'Type of leaderboard to view',
                type: 'STRING',
                choices: [
                    {
                        name: 'Default Leaderboard',
                        value: 'default',
                    },
                    {
                        name: 'Weekly Leaderboard',
                        value: 'weekly',
                    },
                    {
                        name: 'Gamble Leaderboard',
                        value: 'gamble',
                    },
                ],
            },
        ],
    },
    {
        name: 'leaderboard-reset',
        description: 'Reset the weekly leaderboard',
        defaultPermission: false,
    },
];
