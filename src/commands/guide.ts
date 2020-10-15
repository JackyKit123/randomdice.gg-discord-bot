import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import cache, { DeckGuide, EmojiList } from '../helper/cache';
import parseText from '../helper/parseText';

export default async function deckGuide(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const guideName = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg guide ?/i, '');
    if (!guideName) {
        await channel.send(
            'Please include the guide name or use parameter `list` to list guides'
        );
        return;
    }
    const guides = (await cache(database, 'decks_guide')) as DeckGuide[];
    if (guideName === 'list') {
        await channel.send(
            `Here is the list of guides:\n${['PvP', 'Co-op', 'Crew']
                .map(
                    type =>
                        `${type} Guides: ${guides
                            .filter(g => g.type === type && !g.archived)
                            .map(g => `\`${g.name}\``)
                            .join(' ')}`
                )
                .join('\n')}`
        );
        return;
    }
    const guideData = guides.find(
        g => g.name.toLowerCase() === guideName.toLowerCase()
    );

    const execute = async (target: DeckGuide): Promise<void> => {
        const { diceList, name, type, guide, archived } = target;
        const emojiDiceList = await Promise.all(
            diceList.map(async list =>
                Promise.all(
                    list.map(
                        async die =>
                            ((await cache(
                                database,
                                'discord_bot/emoji'
                            )) as EmojiList)[die]
                    )
                )
            )
        );
        const paragraph = parseText(guide).split('\n');
        const embedFields = [
            ...emojiDiceList.map((list, i, decks) => ({
                // eslint-disable-next-line no-nested-ternary
                name: i === 0 ? (decks.length > 1 ? 'Decks' : 'Deck') : '⠀',
                value: list.join(' '),
            })),
            ...paragraph
                .filter(p => p !== '')
                .map((p, i) => ({
                    name: i === 0 ? 'Guide' : '⠀',
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
                                'https://randomdice.gg/title_dice.png',
                                'https://randomdice.gg/'
                            )
                            .setURL(
                                `https://randomdice.gg/decks/guide/${encodeURI(
                                    name
                                )}`
                            );
                    }
                    if (i === arr.length) {
                        embed = embed.setFooter(
                            'randomdice.gg Decks Guide',
                            'https://randomdice.gg/title_dice.png'
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
    if (bestMatch.rating > 0.3) {
        const sentMessage = await channel.send(
            `Guide \`${guideName}\` not found. Did you mean ${bestMatchGuide?.type}: \`${bestMatchGuide?.name}\`? You may answer \`Yes\` to display the guide.`
        );
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
            if (
                awaitedMessage
                    .first()
                    ?.content.replace(/[^\040-\176\200-\377]/gi, '')
                    .match(/^y(es)?/i)
            ) {
                if (awaitedMessage.first()?.deletable) {
                    await awaitedMessage.first()?.delete();
                }
                answeredYes = true;
            }
        } catch {
            await sentMessage.edit(
                `Guide \`${guideName}\` not found. Did you mean ${bestMatchGuide?.type}: \`${bestMatchGuide?.name}\`?`
            );
        }
        if (answeredYes) {
            await execute(
                guides.find(g => g.name === bestMatch.target) as DeckGuide
            );
            await sentMessage.delete();
        } else {
            await sentMessage.edit(
                `Guide \`${guideName}\` not found. Did you mean ${bestMatchGuide?.type}: \`${bestMatchGuide?.name}\`?`
            );
        }
    } else {
        await channel.send(
            `Guide \`${guideName}\` not found. You can do \`.gg guide list\` to search for a list of guides.`
        );
    }
}
