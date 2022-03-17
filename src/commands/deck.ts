import { randomDiceIconUrl } from 'config/url';
import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
} from 'discord.js';
import cache, { Deck } from 'util/cache';
import cooldown from 'util/cooldown';
import getPaginationComponents from 'util/paginationButtons';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function decklist(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options } = interaction;

    if (
        await cooldown(interaction, {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }

    const type = options.getString('deck-type', true);
    const legendaryClass = options.getString('legendary-class') ?? 'default';
    const page = options.getInteger('page') ?? 1;

    const [emoji, decks, battlefields] = [
        cache['discord_bot/emoji'],
        cache.decks,
        cache['wiki/battlefield'],
    ];

    const fields = decks
        .filter(deck => type === deck.type)
        .map(deckInfo => ({
            rating:
                deckInfo.rating[legendaryClass as keyof Deck['rating']] ||
                deckInfo.rating.default,
            diceList: `${deckInfo.decks
                .map(deck => deck.map(die => emoji[die]).join(''))
                .join('\n')}${
                deckInfo.battlefield > -1
                    ? `\nBattlefield: ${
                          battlefields.find(
                              battlefield =>
                                  deckInfo.battlefield === battlefield.id
                          )?.name || '*not found*'
                      }`
                    : ''
            }`,
        }))
        .sort((a, b) => b.rating - a.rating)
        .map(deck => ({
            name: String(deck.rating),
            value: deck.diceList,
        }));
    const pageNumbers = Math.ceil(fields.length / 10);
    let currentPage = 0;
    if (page >= 0) {
        currentPage = page - 1;
        if (currentPage > pageNumbers) {
            currentPage = pageNumbers - 1;
        }
    }
    const embeds = Array(pageNumbers)
        .fill('')
        .map((_, i) =>
            getBrandingEmbed(`/decks/${type}`)
                .setTitle(`Random Dice ${type} Deck List`)
                .setDescription('Each deck is listed below with a rating.')
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setFooter({
                    text: `randomdice.gg Deck List #page ${
                        i + 1
                    }/${pageNumbers}`,
                    iconURL: randomDiceIconUrl,
                })
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

    collectorHandler(sentMessage, interaction.user, embeds);
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'deck',
    description: 'retrieve the deck list',
    options: [
        {
            type: 'STRING',
            name: 'deck-type',
            description: 'the type of deck',
            required: true,
            choices: [
                {
                    name: 'PvP',
                    value: 'PvP',
                },
                {
                    name: 'Co-op',
                    value: 'Co-op',
                },
                {
                    name: 'Crew',
                    value: 'Crew',
                },
            ],
        },
        {
            type: 'STRING',
            name: 'legendary-class',
            description: 'the legendary class of the deck',
            choices: [
                {
                    name: 'Class 7',
                    value: 'c7',
                },
                {
                    name: 'Class 8',
                    value: 'c8',
                },
                {
                    name: 'Class 9',
                    value: 'c9',
                },
                {
                    name: 'Class 10+',
                    value: 'c10',
                },
            ],
        },
        {
            type: 'INTEGER',
            name: 'page',
            description: 'the page number',
            minValue: 1,
        },
    ],
};
