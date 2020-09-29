import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { DeckGuide, EmojiList } from '../helper/cache';
import parseText from '../helper/parseText';

export default async function deckGuide(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const guideName = content.replace(/^\\?\.gg dice ?/, '');
    if (!guideName) {
        await channel.send(
            'Please include the guide name or use parameter `list` to list guides'
        );
        return;
    }
    const guides = (await cache(database, 'decks_guide')) as DeckGuide[];
    if (guideName === 'list') {
        await channel.send(
            `Here is the list of guides: ${guides
                .map(g => `\`${g.name}\``)
                .join(', ')}.`
        );
        return;
    }
    const guideData = guides.find(
        g => g.name.toLowerCase() === guideName.toLowerCase()
    );
    if (!guideData) {
        await channel.send(`Guide \`${guideName}\` not found.`);
        return;
    }

    const { diceList, name, type, guide, archived } = guideData;
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
    const embed = new Discord.MessageEmbed()
        .setTitle(`${name} (${type})${archived ? '**ARCHIVED**' : ''}`)
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/title_dice.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setURL(`https://randomdice.gg/decks/guide/${encodeURI(name)}`)
        .addFields(embedFields)
        .setFooter(
            'randomdice.gg Decks Guide',
            'https://randomdice.gg/title_dice.png'
        );
    await channel.send(embed);
}
