import Discord from 'discord.js';

export default async function statistic(
    message: Discord.Message
): Promise<void> {
    const { channel, client } = message;
    await channel.send(
        `Hi! I am version **\`${
            process.env.NODE_ENV === 'development'
                ? 'development'
                : process.env.HEROKU_RELEASE_VERSION
        }\`** of ${client.user?.toString()}.`
    );
}
