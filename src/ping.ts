import * as Discord from 'discord.js';

export default async function ping(message: Discord.Message): Promise<void> {
    const latency = new Date().valueOf() - message.createdTimestamp;

    message.channel.send(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(`Time elapsed: ${latency}ms`)
            .setColor('#6ba4a5')
            .setThumbnail('https://randomdice.gg/title_dice.png')
    );
}
