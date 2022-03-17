import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cache from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import getBrandingEmbed from './util/getBrandingEmbed';

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
    let embed = getBrandingEmbed()
        .setTitle('Random Dice news')
        .addFields(fields)
        .setTimestamp();
    if (imgUrl) {
        embed = embed.setImage(imgUrl);
    }

    return {
        ytUrl,
        embed,
    };
};

export default async function sendNews(
    interaction: CommandInteraction
): Promise<void> {
    const { commandName } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const { ytUrl, embed } = getNewsInfo();

    await interaction.reply({ embeds: [embed] });
    if (ytUrl) {
        await interaction.followUp(ytUrl);
    }
}

export const commandData: ApplicationCommandData = {
    name: 'news',
    description: 'Get the latest news for Random Dice.',
};
