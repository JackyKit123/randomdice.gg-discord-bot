import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
    MessageEmbed,
} from 'discord.js';
import cache, { DeckGuide } from 'util/cache';
import parseText from 'util/parseText';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import { mapChoices } from 'register/commandData';
import bestMatchFollowUp from './util/bestMatchFollowUp';
import getBrandingEmbed from './util/getBrandingEmbed';

export const getGuideData = (
    target?: DeckGuide
): { embeds: MessageEmbed[] } | string => {
    const [battlefields, emojiList] = [
        cache['wiki/battlefield'],
        cache['discord_bot/emoji'],
    ];
    if (!target) return 'No guide found.';
    const { diceList, name, type, guide, archived, battlefield } = target;
    const emojiDiceList = diceList.map(list => list.map(die => emojiList[die]));

    const paragraph = parseText(guide).split('\n');
    const embedFields = [
        ...emojiDiceList.map((list, i, decks) => ({
            // eslint-disable-next-line no-nested-ternary
            name: i === 0 ? (decks.length > 1 ? 'Decks' : 'Deck') : '‎',
            value: list.join(' '),
        })),
        ...(battlefield > -1 && type !== 'Crew'
            ? [
                  {
                      name: 'Battlefield',
                      value:
                          battlefields.find(b => b.id === battlefield)?.name ||
                          '*not found*',
                  },
              ]
            : []),
        ...paragraph
            .filter(p => p !== '')
            .map((p, i) => ({
                name: i === 0 ? 'Guide' : '‎',
                value: p,
            })),
    ];
    return {
        embeds: new Array(Math.ceil(embedFields.length / 16))
            .fill(0)
            .map((_, i, arr) => {
                let embed = getBrandingEmbed(
                    `/decks/guide/${encodeURI(name)}`
                ).addFields(embedFields.slice(i * 16, i * 16 + 16));
                if (i === 0) {
                    embed = embed.setTitle(
                        `${name} (${type})${archived ? '**ARCHIVED**' : ''}`
                    );
                } else {
                    embed = embed.setAuthor(null);
                }
                if (i !== arr.length - 1) {
                    embed = embed.setFooter(null);
                }
                return embed;
            }),
    };
};

export default async function deckGuide(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg guide', {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }
    const guideName =
        input instanceof Message
            ? input.content.replace(/^\\?\.gg guide ?/i, '')
            : input.options.getString('deck-name') ?? '';
    if (!guideName) {
        await reply(
            input,
            'Please include the guide name or use parameter `list` to list guides'
        );
        return;
    }
    const guides = cache.decks_guide;
    const guideList = getBrandingEmbed('/decks/guide')
        .setTitle('Random Dice Deck Guides List')
        .addFields(
            ['PvP', 'Co-op', 'Crew'].map(type => ({
                name: `${type} Guides`,
                value: guides
                    .filter(g => g.type === type && !g.archived)
                    .map(g => `\`${g.name}\``)
                    .join('\n'),
            }))
        );

    if (guideName === 'list') {
        await reply(input, { embeds: [guideList] });
        return;
    }
    const guideData = guides.find(
        g => g.name.toLowerCase() === guideName.toLowerCase()
    );

    if (guideData) {
        await reply(input, getGuideData(guideData));
        return;
    }

    await bestMatchFollowUp(
        input,
        guideName,
        guides,
        ' is not a guide written.',
        getGuideData
    );
}

export const commandData = (guides: DeckGuide[]): ApplicationCommandData => ({
    name: 'guide',
    description: 'get the guide for a deck',
    options: [
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        {
            type: 3,
            name: 'deck-name',
            description:
                'the name of the deck, use /guide list to see all deck guides',
            required: true,
            choices: mapChoices(guides),
        },
    ],
});
