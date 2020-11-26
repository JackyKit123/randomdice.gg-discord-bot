import * as Discord from 'discord.js';

export default async function statistic(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    await channel.send(
        `Hi! I am version **\`${
            process.env.NODE_ENV === 'development'
                ? 'development'
                : process.env.HEROKU_RELEASE_VERSION
        }\`** of ${(client.user as Discord.ClientUser).toString()}.`
    );
}
