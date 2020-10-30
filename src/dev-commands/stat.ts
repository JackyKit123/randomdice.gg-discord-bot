import * as Discord from 'discord.js';

export default async function statistic(
    client: Discord.Client,
    channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel
): Promise<void> {
    const guildCount = client.guilds.cache.size;
    const guildData = client.guilds.cache.map(guild => {
        let memberCountString = guild.memberCount.toString();
        while (memberCountString.length < 6) {
            memberCountString = ` ${memberCountString}`;
        }
        return `${guild.id}|      ${memberCountString}|${guild.name}`;
    });

    await channel.send(
        `I am ${client.user?.toString()}, I am now serving in **${guildCount}** discord servers.\n\`\`\`Server Id         |Member Count|Server Name\n${guildData.join(
            '\n'
        )}\`\`\``
    );
}
