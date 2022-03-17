import { randomDiceIconUrl, randomDiceWebsiteUrl } from 'config/url';
import { MessageEmbed } from 'discord.js';

export default function getBrandingEmbed(url = ''): MessageEmbed {
    return new MessageEmbed()
        .setAuthor({
            name: 'Random Dice Community Website',
            iconURL: randomDiceIconUrl,
            url: randomDiceWebsiteUrl(),
        })
        .setURL(randomDiceWebsiteUrl(url))
        .setColor('#6ba4a5')
        .setFooter({
            text: 'Powered by randomdice.gg Community',
            iconURL: randomDiceIconUrl,
        });
}
