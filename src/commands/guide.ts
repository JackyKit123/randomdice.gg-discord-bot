import * as Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import cache, { DeckGuide } from '../util/cache';
import parseText from '../util/parseText';
import cooldown from '../util/cooldown';

export default async function deckGuide(
    message: Discord.Message
): Promise<void> {
    const { channel, content } = message;

    if (
        await cooldown(message, '.gg guide', {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }
    const guideName = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg guide ?/i, '');
    if (!guideName) {
        await channel.send(
            'Please include the guide name or use parameter `list` to list guides'
        );
        return;
    }
    const [guides, battlefields, emojiList] = [
        cache.decks_guide,
        cache['wiki/battlefield'],
        cache['discord_bot/emoji'],
    ];

    const guideList = new Discord.MessageEmbed()
        .setColor('#6ba4a5')
        .setTitle('Random Dice Deck Guides List')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setURL(`https://randomdice.gg/decks/guide/}`)
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
        await channel.send(guideList);
        return;
    }
    const guideData = guides.find(
        g => g.name.toLowerCase() === guideName.toLowerCase()
    );

    const execute = async (target: DeckGuide): Promise<void> => {
        const { diceList, name, type, guide, archived, battlefield } = target;
        const emojiDiceList = diceList.map(list =>
            list.map(die => emojiList[die])
        );

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
                              battlefields.find(b => b.id === battlefield)
                                  ?.name || '*not found*',
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
        await Promise.all(
            new Array(Math.ceil(embedFields.length / 16))
                .fill(0)
                .map((_, i, arr) => {
                    let embed = new Discord.MessageEmbed()
                        .setColor('#6ba4a5')
                        .addFields(embedFields.slice(i * 16, i * 16 + 16));
                    if (i === 0) {
                        embed = embed
                            .setTitle(
                                `${name} (${type})${
                                    archived ? '**ARCHIVED**' : ''
                                }`
                            )
                            .setAuthor(
                                'Random Dice Community Website',
                                'https://randomdice.gg/android-chrome-512x512.png',
                                'https://randomdice.gg/'
                            )
                            .setURL(
                                `https://randomdice.gg/decks/guide/${encodeURI(
                                    name
                                )}`
                            );
                    }
                    if (i === arr.length - 1) {
                        embed = embed.setFooter(
                            'randomdice.gg Decks Guide',
                            'https://randomdice.gg/android-chrome-512x512.png'
                        );
                    }
                    return channel.send(embed);
                })
        );
    };

    if (guideData) {
        await execute(guideData);
        return;
    }

    const { bestMatch } = stringSimilarity.findBestMatch(
        guideName,
        guides.map(g => g.name)
    );
    const bestMatchGuide = guides.find(
        guide => guide.name === bestMatch.target
    );
    const sentMessage = await channel.send(
        bestMatch.rating > 0.3
            ? `Guide \`${guideName}\` not found. Did you mean \`${bestMatchGuide?.type} Deck: ${bestMatchGuide?.name}\`? You may answer \`Yes\` to display the guide, or you can lookup a list guide here and display the guide with \`.gg guide <guide name>\`.`
            : `Guide \`${guideName}\` not found. Here is a list of deck guides that we have created.`,
        guideList
    );
    if (bestMatch.rating <= 0.3) {
        return;
    }
    let answeredYes = false;
    try {
        const awaitedMessage = await channel.awaitMessages(
            (newMessage: Discord.Message) =>
                newMessage.author === message.author &&
                !!newMessage.content
                    .replace(/[^\040-\176\200-\377]/gi, '')
                    .match(/^(y(es)?|no?|\\?\.gg ?)/i),
            { time: 60000, max: 1, errors: ['time'] }
        );
        const response = awaitedMessage
            .first()
            ?.content.replace(/[^\040-\176\200-\377]/gi, '');
        if (response?.match(/^y(es)?/i)) {
            answeredYes = true;
        }
    } catch {
        if (sentMessage.editable) {
            await sentMessage.edit(
                `Guide \`${guideName}\` not found. Here is a list of deck guides that we have created.`,
                guideList
            );
        }
    }
    if (answeredYes) {
        await execute(
            guides.find(g => g.name === bestMatch.target) as DeckGuide
        );
    } else if (sentMessage.editable) {
        await sentMessage.edit(
            `Guide \`${guideName}\` not found. Here is a list of deck guides that we have created.`,
            guideList
        );
    }
}
