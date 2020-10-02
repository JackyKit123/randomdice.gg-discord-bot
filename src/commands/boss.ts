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

    if (!boss) {
        const { bestMatch } = stringSimilarity.findBestMatch(
            bossName,
            bossList.map(b => b.name)
        );
        await channel.send(
            `\`${bossName}\` is not a valid boss.${
                bestMatch.rating >= 0.3
                    ? ` Did you mean \`${bestMatch.target}\`?`
                    : ''
            }`
        );
        return;
    }

    const embedFields = parsedText(boss.desc)
        .split('\n')
        .filter(p => p !== '')
        .map((desc, i) => ({
            name: i === 0 ? 'Boss Mechanic' : '⠀',
            value: desc,
        }));

    await channel.send(
        new Discord.MessageEmbed()
            .setTitle(boss.name)
            .setThumbnail(boss.img)
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/title_dice.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setURL(
                `https://randomdice.gg/wiki/boss_mechanics#${encodeURI(
                    boss.name
                )}`
            )
            .addFields(embedFields)
            .setFooter(
                'randomdice.gg Boos Information',
                'https://randomdice.gg/title_dice.png'
            )
    );
}
