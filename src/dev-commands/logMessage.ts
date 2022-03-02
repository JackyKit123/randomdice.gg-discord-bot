import getBrandingEmbed from 'commands/util/getBrandingEmbed';
import { Client, Message } from 'discord.js';

export default async function log(
    client: Client,
    message = ''
): Promise<Message | undefined> {
    const logChannel = client.channels.cache.get(
        process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
    );

    if (logChannel?.isText()) {
        return logChannel.send({
            content:
                Array.from(message.matchAll(/<@!?(\d{18})>/g)).join('') ||
                undefined,
            embeds: [
                getBrandingEmbed()
                    .setDescription(message)
                    .setAuthor(null)
                    .setFooter({
                        text: `env: ${process.env.NODE_ENV}`,
                    }),
            ],
        });
    }
    return undefined;
}
