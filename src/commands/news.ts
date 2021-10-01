import Discord from 'discord.js';
import cache from '../util/cache';
import parsedText from '../util/parseText';
import cooldown from '../util/cooldown';

export default async function sendNews(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;

    if (
        await cooldown(message, '.gg news', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }
    const newsData = cache.news;
    const ytUrl = newsData.game.match(
        /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-_]*)(&(amp;)?[\w?=]*)?/
    )?.[0];
    const news = parsedText(newsData.game);
    const imgUrl = news.match(/{img}((?!.*{img}).*){\/img}/)?.[1];
    const fields = news
        .replace(/{img}((?!.*{img}).*){\/img}/g, '')
        .split('\n\n')
        .map((value, i) => ({
            name: i === 0 ? 'News' : '‎',
            value,
        }));
    let embed = new Discord.MessageEmbed()
        .setColor('#6ba4a5')
        .setTitle('Random Dice news')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setURL('https://randomdice.gg/')
        .addFields(fields)
        .setTimestamp()
        .setFooter(
            'randomdice.gg News Update',
            'https://randomdice.gg/android-chrome-512x512.png'
        );
    if (imgUrl) {
        embed = embed.setImage(imgUrl);
    }

    await channel.send({ embeds: [embed] });
    if (ytUrl) {
        await channel.send(ytUrl);
    }
}
