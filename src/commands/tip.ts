import * as Discord from 'discord.js';
import cache from '../helper/cache';
import parseText from '../helper/parseText';

export default async function dice(message: Discord.Message): Promise<void> {
    const { channel } = message;
    const tips = cache['wiki/tips'];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    await channel.send(
        new Discord.MessageEmbed()
            .setTitle('Random Dice Tips and Tricks')
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/android-chrome-512x512.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setURL('https://randomdice.gg/wiki/guide')
            .setImage(randomTip.img)
            .setDescription(parseText(randomTip.desc))
            .setFooter(
                'randomdice.gg Tips',
                'https://randomdice.gg/android-chrome-512x512.png'
            )
    );
}
