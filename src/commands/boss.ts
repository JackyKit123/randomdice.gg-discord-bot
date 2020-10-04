import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import cache, { Boss } from '../helper/cache';
import parsedText from '../helper/parseText';

export default async function dice(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const bossName = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg boss ?/, '');
    if (!bossName) {
        await channel.send(
            'Please include the boss name in command parameter.'
        );
        return;
    }
    const bossList = (await cache(database, 'wiki/boss')) as Boss[];
    const boss = bossList.find(
        b => b.name.toLowerCase() === bossName.toLowerCase()
    );

    const execute = async (target: Boss): Promise<void> => {
        const embedFields = parsedText(target.desc)
            .split('\n')
            .filter(p => p !== '')
            .map((desc, i) => ({
                name: i === 0 ? 'Boss Mechanic' : '⠀',
                value: desc,
            }));

        await channel.send(
            new Discord.MessageEmbed()
                .setTitle(target.name)
                .setThumbnail(target.img)
                .setAuthor(
                    'Random Dice Community Website',
                    'https://randomdice.gg/title_dice.png',
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
                    'https://randomdice.gg/title_dice.png'
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
            await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    newMessage.author === message.author &&
                    /^y(es)?\b/i.test(newMessage.content),
                { time: 6000, max: 1, errors: ['time'] }
            );
            answeredYes = true;
        } catch {
            await sentMessage.edit(`\`${bossName}\` is not a valid boss.`);
        }
        if (answeredYes) {
            await execute(
                bossList.find(b => b.name === bestMatch.target) as Boss
            );
        }
    } else {
        await channel.send(`\`${bossName}\` is not a valid boss.`);
    }
}
