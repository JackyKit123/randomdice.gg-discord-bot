import * as Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import cache, { Boss } from '../util/cache';
import parsedText from '../util/parseText';
import cooldown from '../util/cooldown';

export default async function dice(message: Discord.Message): Promise<void> {
    const { channel, content } = message;

    if (
        await cooldown(message, '.gg boss', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const bossName = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg boss ?/, '');
    if (!bossName) {
        await channel.send(
            'Please include the boss name in command parameter.'
        );
        return;
    }
    const bossList = cache['wiki/boss'];
    const boss = bossList.find(
        b => b.name.toLowerCase() === bossName.toLowerCase()
    );

    const execute = async (target: Boss): Promise<void> => {
        const embedFields = parsedText(target.desc)
            .split('\n')
            .filter(p => p !== '')
            .map((desc, i) => ({
                name: i === 0 ? 'Boss Mechanic' : '‎',
                value: desc,
            }));

        await channel.send(
            new Discord.MessageEmbed()
                .setTitle(target.name)
                .setThumbnail(target.img)
                .setAuthor(
                    'Random Dice Community Website',
                    'https://randomdice.gg/android-chrome-512x512.png',
                    'https://randomdice.gg/'
                )
                .setColor('#6ba4a5')
                .setURL(
                    `https://randomdice.gg/wiki/boss_mechanics#${encodeURI(
                        target.name
                    )}`
                )
                .addFields(embedFields)
                .setFooter(
                    'randomdice.gg Boos Information',
                    'https://randomdice.gg/android-chrome-512x512.png'
                )
        );
    };

    if (boss) {
        await execute(boss);
        return;
    }

    const { bestMatch } = stringSimilarity.findBestMatch(
        bossName,
        bossList.map(b => b.name)
    );
    if (bestMatch.rating >= 0.3) {
        const sentMessage = await channel.send(
            `\`${bossName}\` is not a valid boss. Did you mean \`${bestMatch.target}\`? You may answer \`Yes\` to display the boss info.`
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
                answeredYes = true;
            }
        } catch {
            if (sentMessage.editable)
                await sentMessage.edit(
                    `\`${bossName}\` is not a valid boss. Did you mean \`${bestMatch.target}\`?`
                );
        }
        if (answeredYes) {
            await execute(
                bossList.find(b => b.name === bestMatch.target) as Boss
            );
        }
        if (sentMessage.editable) {
            await sentMessage.edit(
                `\`${bossName}\` is not a valid boss. Did you mean \`${bestMatch.target}\`?`
            );
        }
    } else {
        await channel.send(`\`${bossName}\` is not a valid boss.`);
    }
}
