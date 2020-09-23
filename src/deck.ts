import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { Deck, EmojiList } from './cache';

export default async function decklist(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { content, channel } = message;
    const [, , type] = content.split(' ');
    if (!type.match(/^(pvp|co-op|crew)$/)) {
        await channel.send('Please specify deck type in: `PvP` `Co-op` `Crew`');
        return;
    }

    const [emoji, decks] = await Promise.all([
        cache(database, 'discord_bot/emoji') as Promise<EmojiList>,
        cache(database, 'decks') as Promise<Deck[]>,
    ]);
    const fields = decks
        .filter(deck => deck.type.toLowerCase() === type.toLowerCase())
        .map(deckInfo => ({
            rating: deckInfo.rating,
            diceList: deckInfo.decks
                .map(deck => deck.map(die => emoji[die]).join(''))
                .join('\n'),
        }))
        .map(deck => ({
            name: deck.rating,
            value: deck.diceList,
        }));
    const pageNumbers = Math.ceil(fields.length / 10);
    let currentPage = 0;
    const embeds = Array(pageNumbers)
        .fill('')
        .map((_, i) =>
            new Discord.MessageEmbed()
                .setColor('#6ba4a5')
                .setTitle(
                    `Random Dice ${
                        // eslint-disable-next-line no-nested-ternary
                        type.toLowerCase() === 'pvp'
                            ? 'PvP'
                            : // eslint-disable-next-line no-nested-ternary
                            type.toLowerCase() === 'co-op'
                            ? 'Co-op'
                            : type.toLowerCase() === 'crew'
                            ? 'Crew'
                            : ''
                    } Deck List`
                )
                .setAuthor(
                    'Random Dice Community Website',
                    'https://randomdice.gg/title_dice.png',
                    'https://randomdice.gg/'
                )
                .setURL(`https://randomdice.gg/decks/${type}`)
                .setDescription(
                    `Showing page ${i +
                        1} of ${pageNumbers}. Each deck is listed below with a rating.`
                )
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setFooter(
                    `randomdice.gg Deck List #page ${i + 1}/${pageNumbers}`,
                    'https://randomdice.gg/title_dice.png'
                )
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
            user.id === message.author.id,
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
        await sentMessage.edit(embeds[currentPage]);
        await reaction.users.remove(user.id);
    });
}
