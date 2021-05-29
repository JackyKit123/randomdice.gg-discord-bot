import * as Discord from 'discord.js';
import cooldown from '../util/cooldown';

export default async function ping(message: Discord.Message): Promise<void> {
    const { createdTimestamp, channel } = message;

    if (
        await cooldown(message, '.gg ping', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const sent = await channel.send(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(`Time elapsed: ...ms`)
            .setColor('#6ba4a5')
            .setThumbnail('https://randomdice.gg/android-chrome-512x512.png')
    );
    await sent.edit(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(
                `Time elapsed: ${sent.createdTimestamp - createdTimestamp}ms`
            )
            .setColor('#6ba4a5')
            .setThumbnail('https://randomdice.gg/android-chrome-512x512.png')
    );
}
