import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
    MessageEmbed,
} from 'discord.js';
import cache from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';

export const getNewsInfo = (): {
    ytUrl: string | undefined;
    embed: MessageEmbed;
} => {
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
    let embed = new MessageEmbed()
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

    return {
        ytUrl,
        embed,
    };
};

export default async function sendNews(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg news', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const { ytUrl, embed } = getNewsInfo();

    await reply(input, { embeds: [embed] });
    if (ytUrl) {
        await input?.channel?.send(ytUrl);
    }
}

export const commandData: ApplicationCommandData = {
    name: 'news',
    description: 'Get the latest news for Random Dice.',
};
