import Discord from 'discord.js';

export default async function log(
    client: Discord.Client,
    message: string
): Promise<Discord.Message | undefined> {
    const logChannel = client.channels.cache.get(
        process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
    );

    if (logChannel) {
        return (logChannel as Discord.TextChannel).send(message);
    }
    return undefined;
}
