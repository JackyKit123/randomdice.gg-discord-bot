import Discord from 'discord.js';
import cache, { Deck } from '../util/cache';
import cooldown from '../util/cooldown';

export default async function decklist(
    message: Discord.Message
): Promise<void> {
    const { content, channel } = message;

    if (
        await cooldown(message, '.gg deck', {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }
    const command = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg deck ?/i, '');
    const type = command.split(' ')[0];
    if (!type.match(/^(pvp|co-op|coop|crew)$/i)) {
        await channel.send(
            `${
                type ? `\`${type}\` is not a valid deck type, p` : 'P'
            }lease specify deck type in: \`PvP\` \`Co-op\` \`Crew\``
        );
        return;
    }

    const firstArgs = command.replace(/^co-op ?/i, '').indexOf('-');
    if (firstArgs > -1) {
        const otherArgs = [
            ...command
                .replace(/^co-op ?/i, '')
                .slice(firstArgs, command.length)
                .replace(/(?:-l|--legendary|-p|--page)[=| +]\w+/gi, '')
                .matchAll(/--?\w+(?:[=| +]\w+)?/gi),
        ];
        if (otherArgs.length) {
            await channel.send(
                `Unknown arguments: ${otherArgs.map(
                    ([arg]) => `\`${arg}\``
                )}. Acceptable arguments are \`--legendary\` \`--page\` or alias \`-l\` \`-p\``
            );
            return;
        }
    }

    const legendaryClassArgs = [
        ...command
            .slice(firstArgs, command.length)
            .matchAll(/(?:-l|--legendary)[=| +](\w+)/gi),
    ];
    const pageArgs = [
        ...command
            .slice(firstArgs, command.length)
            .matchAll(/(?:-p|--page)[=| +](\w+)/gi),
    ];

    if (legendaryClassArgs.length > 1 || pageArgs.length > 1) {
        if (legendaryClassArgs.length > 1) {
            await channel.send(
                `Duplicated arguments for legendary class settings: ${legendaryClassArgs
                    .map(arg => `\`${arg?.[0]}\``)
                    .join(' ')}`
            );
        }

        if (pageArgs.length > 1) {
            await channel.send(
                `Duplicated arguments for page: ${pageArgs
                    .map(arg => `\`${arg?.[0]}\``)
                    .join(' ')}`
            );
        }
        return;
    }

    const legendaryClassArg = legendaryClassArgs[0]?.[1];
    const pageArg = pageArgs[0]?.[1];
    let legendaryClass = legendaryClassArg || 'default';
    const page = Number(pageArg || 1);

    if (
        !legendaryClass.match('(c7|c8|c9|c10|default|7|8|9|10)') ||
        Number.isNaN(page) ||
        page < 1
    ) {
        if (Number.isNaN(page)) {
            await channel.send(
                `Invalid arguments for page, \`${pageArg}\` is not a number.`
            );
        } else if (page < 1) {
            await channel.send(
                `Invalid arguments for page, page number \`${page}\` should be at least 1.`
            );
        }

        if (!legendaryClass.match('(c7|c8|c9|c10|default|7|8|9|10)')) {
            await channel.send(
                `Invalid arguments for legendary class setting, \`${pageArg}\` is not a acceptable. You may specify \`c7\` \`c8\` \`c9\` \`c10\``
            );
        }
        return;
    }

    if (legendaryClass.match('7')) {
        legendaryClass = 'default';
    }

    if (legendaryClass.match(/^(8|9|10)$/)) {
        legendaryClass = `c${legendaryClass}`;
    }

    const [emoji, decks, battlefields] = [
        cache['discord_bot/emoji'],
        cache.decks,
        cache['wiki/battlefield'],
    ];
    const deckType = ({
        pvp: 'PvP',
        coop: 'Co-op',
        'co-op': 'Co-op',
        crew: 'Crew',
    } as { [key: string]: string })[type.toLowerCase()];
    const fields = decks
        .filter(deck => deckType === deck.type)
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
        .map(deck => ({
            name: deck.rating,
            value: deck.diceList,
        }))
        .sort((a, b) => b.name - a.name);
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
            new Discord.MessageEmbed()
                .setColor('#6ba4a5')
                .setTitle(`Random Dice ${deckType} Deck List`)
                .setAuthor(
                    'Random Dice Community Website',
                    'https://randomdice.gg/android-chrome-512x512.png',
                    'https://randomdice.gg/'
                )
                .setURL(`https://randomdice.gg/decks/${deckType}`)
                .setDescription(
                    `Showing page ${
                        i + 1
                    } of ${pageNumbers}. Each deck is listed below with a rating. Use the message reaction to flip page.`
                )
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setFooter(
                    `randomdice.gg Deck List #page ${i + 1}/${pageNumbers}`,
                    'https://randomdice.gg/android-chrome-512x512.png'
                )
        );
    const sentMessage = await channel.send(embeds[currentPage]);
    if (pageNumbers <= 1) {
        return;
    }

    const collector = sentMessage.createReactionCollector(
        reaction =>
            ['⏪', '◀️', '▶️', '⏩', '❌'].includes(reaction.emoji.name),
        {
            time: 180000,
        }
    );

    collector.on('collect', async (reaction, user) => {
        switch (reaction.emoji.name) {
            case '⏪':
                currentPage = 0;
                break;
            case '◀️':
                currentPage -= 1;
                break;
            case '▶️':
                currentPage += 1;
                break;
            case '⏩':
                currentPage = pageNumbers - 1;
                break;
            case '❌':
                collector.stop();
                break;
            default:
        }
        if (sentMessage.editable) await sentMessage.edit(embeds[currentPage]);
        await reaction.users.remove(user.id);
    });

    collector.on('end', async () => {
        try {
            await sentMessage.delete();
        } catch {
            // message prob got deleted
        }
    });

    await sentMessage.react('⏪');
    await sentMessage.react('◀️');
    await sentMessage.react('▶️');
    await sentMessage.react('⏩');
    await sentMessage.react('❌');
}
