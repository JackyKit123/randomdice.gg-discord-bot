import * as Discord from 'discord.js';

export default async function chatRevivePing(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    if (channel.id !== '804222694488932364') {
        return;
    }

    channel
        .awaitMessages(
            (msg: Discord.Message) =>
                !msg.author.bot && msg.channel.id === channel.id,
            {
                max: 1,
                time: 1000 * 60 * 10,
                errors: ['time'],
            }
        )
        .catch(async () =>
            channel.send(
                '<@&807578981003689984> come and revive this dead chat.'
            )
        );
}

export async function fetchGeneralOnBoot(
    client: Discord.Client
): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    const general = await guild.channels.cache.get('804222694488932364');
    if (general?.type !== 'text') {
        return;
    }
    try {
        const lastMessages = await (general as Discord.TextChannel).messages.fetch();
        const lastMessage = lastMessages
            .filter(message => !message.author.bot)
            .first();
        if (!lastMessage) return;
        const deadChatTimer = Date.now() - lastMessage.createdTimestamp;
        const tenMinutes = 1000 * 60 * 10;
        if (deadChatTimer >= tenMinutes) {
            await (general as Discord.TextChannel).send(
                '<@&807578981003689984> come and revive this dead chat.'
            );
        }
        try {
            await (general as Discord.TextChannel).awaitMessages(
                (msg: Discord.Message) =>
                    !msg.author.bot && msg.channel.id === general.id,
                {
                    max: 1,
                    time: tenMinutes - deadChatTimer,
                    errors: ['time'],
                }
            );
        } catch {
            await (general as Discord.TextChannel).send(
                '<@&807578981003689984> come and revive this dead chat.'
            );
        }
    } catch {
        // suppress error
    }
}
