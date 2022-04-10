import {
    ApplicationCommandData,
    CommandInteraction,
    EmbedField,
    MessageEmbed,
} from 'discord.js';
import cache, { MemberCurrency } from 'util/cache';
import cooldown from 'util/cooldown';
import getPaginationComponents from 'util/paginationButtons';
import { coinDice, getCoinDiceEmoji } from 'config/emojiId';
import { isJackykit } from 'config/users';
import { communityDiscordInvitePermaLink } from 'config/url';

const numberFormat = new Intl.NumberFormat();

type LeaderboardType = 'default' | 'weekly' | 'gamble';

export function sortLeaderboard<TReturns extends 'embed' | 'raw'>(
    type: LeaderboardType = 'default',
    returns: TReturns
): TReturns extends 'embed' ? EmbedField[] : MemberCurrency {
    const currencyList = cache['discord_bot/community/currency'];
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
    const sorted = Object.entries(currencyList)
        .sort(sortFn[type])
        .filter(([id, profile]) => {
            switch (type) {
                case 'gamble':
                    return !!profile.gamble;
                case 'default':
                    return !isJackykit(id);
                default:
                    return true;
            }
        });

    return (
        returns === 'raw'
            ? Object.fromEntries(sorted)
            : sorted.map(([uid, profile], i) => ({
                  name: `#${i + 1}`,
                  value: `<@!${uid}> \n${coinDice} **__${numberFormat.format(
                      value[type](profile)
                  )}__**`,
                  inline: false,
              }))
    ) as TReturns extends 'embed' ? EmbedField[] : MemberCurrency;
}

export default async function leaderboard(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, guild, member, options } = interaction;

    if (
        await cooldown(interaction, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const type = (options.getString('type') ?? 'default') as LeaderboardType;
    let title = 'Richest People in the Server';
    if (type === 'weekly') title = 'Most Active People this week';
    if (type === 'gamble') title = 'Biggest Gambler of all time';

    const fields = sortLeaderboard(type, 'embed');

    const pageNumbers = Math.ceil(fields.length / 10);
    let currentPage = 0;
    if (currentPage > pageNumbers) {
        currentPage = pageNumbers - 1;
    }

    const embeds = await Promise.all(
        Array(pageNumbers)
            .fill('')
            .map(async (_, i) =>
                new MessageEmbed()
                    .setColor('#6ba4a5')
                    .setThumbnail(getCoinDiceEmoji(client)?.url ?? '')
                    .setTitle(title)
                    .setAuthor({
                        name: 'Randomdice.gg Server',
                        iconURL:
                            guild.iconURL({
                                dynamic: true,
                            }) ?? undefined,
                        url: communityDiscordInvitePermaLink,
                    })
                    .addFields(fields.slice(i * 10, i * 10 + 10))
                    .setTimestamp()
                    .setFooter({
                        text: `Showing page ${i + 1} of ${pageNumbers}.`,
                    })
            )
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

export * from './weeklyTop5';

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
