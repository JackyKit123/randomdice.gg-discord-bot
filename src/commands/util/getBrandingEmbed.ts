import { MessageEmbed } from 'discord.js';

export default function getBrandingEmbed(url = ''): MessageEmbed {
    return new MessageEmbed()
        .setAuthor({
            name: 'Random Dice Community Website',
            iconURL: 'https://randomdice.gg/android-chrome-512x512.png',
            url: 'https://randomdice.gg/',
        })
        .setURL(`https://randomdice.gg/${url.replace(/^\//, '')}`)
        .setColor('#6ba4a5')
        .setFooter({
            text: 'Powered by randomdice.gg Community',
            iconURL: 'https://randomdice.gg/android-chrome-512x512.png',
        });
}
