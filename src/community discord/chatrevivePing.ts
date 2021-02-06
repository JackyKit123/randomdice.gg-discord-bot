import * as Discord from 'discord.js';

export default async function chatRevivePing(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    if (channel.id !== '804222694488932364') {
        return;
    }
    try {
        await channel.awaitMessages(
            (msg: Discord.Message) =>
                !msg.author.bot && msg.channel.id === channel.id,
            {
                max: 1,
                time: 1000 * 60 * 10,
                errors: ['time'],
            }
        );
    } catch {
        await channel.send(
            '<@&807578981003689984> come and revive this dead chat.'
        );
    }
}
