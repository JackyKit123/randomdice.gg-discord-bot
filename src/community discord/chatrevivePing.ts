import channelIds from 'config/channelIds';
import roleIds from 'config/roleId';
import Discord from 'discord.js';

let timeout: NodeJS.Timeout;
export default async function chatRevivePing(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    if (channel.id !== channelIds.general) {
        return;
    }

    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(
        async () =>
            channel.send(
                `<@&${roleIds['Chat Revive Ping']}> come and revive this dead chat.`
            ),
        1000 * 60 * 60
    );
}

export async function fetchGeneralOnBoot(
    client: Discord.Client
): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    const general = guild?.channels.cache.get(channelIds.general);
    if (!general?.isText()) return;
    try {
        const lastMessages = await general.messages.fetch();
        const lastMessage = lastMessages
            .filter(message => !message.author.bot)
            .first();
        if (!lastMessage) return;
        const deadChatTimer = Date.now() - lastMessage.createdTimestamp;
        const tenMinutes = 1000 * 60 * 60;
        if (!timeout) {
            timeout = setTimeout(
                async () =>
                    general.send(
                        `<@&${roleIds['Chat Revive Ping']}> come and revive this dead chat.`
                    ),
                tenMinutes - deadChatTimer
            );
        }
    } catch {
        // suppress error
    }
}
