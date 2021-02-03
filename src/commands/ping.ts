import * as Discord from 'discord.js';
import cooldown from '../helper/cooldown';

export default async function ping(message: Discord.Message): Promise<void> {
    const { createdTimestamp, channel } = message;

    const latency = Date.now().valueOf() - createdTimestamp;

    if (
        await cooldown(message, '.gg ping', {
            default: 2 * 1000,
            donator: 0.5 * 1000,
        })
    ) {
        return;
    }

    await channel.send(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(`Time elapsed: ${latency}ms`)
            .setColor('#6ba4a5')
            .setThumbnail('https://randomdice.gg/android-chrome-512x512.png')
    );
}
