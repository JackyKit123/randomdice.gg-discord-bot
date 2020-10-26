import * as Discord from 'discord.js';

export default async function statistic(
    client: Discord.Client,
    channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel
): Promise<void> {
    const guildCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    await channel.send(
        `I am ${client.user?.toString()}, I am now serving **${userCount}** users across **${guildCount}** discord servers.`
    );
}
