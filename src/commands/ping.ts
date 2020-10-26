import * as Discord from 'discord.js';

export default async function ping(message: Discord.Message): Promise<void> {
    const { createdTimestamp, channel, member } = message;

    const latency = new Date().valueOf() - createdTimestamp;

    if (
        channel.id !== process.env.DEV_SERVER_ID &&
        !member?.hasPermission('ADMINISTRATOR')
    ) {
        await channel.send(
            '`ping` command is only intended for testing purpose. Please only use it in DM channel or as `ADMINISTRATOR`.'
        );
        return;
    }
    await message.channel.send(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(`Time elapsed: ${latency}ms`)
            .setColor('#6ba4a5')
            .setThumbnail('https://randomdice.gg/favicon.ico')
    );
}
