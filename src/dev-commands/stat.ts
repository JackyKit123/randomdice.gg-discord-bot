import * as Discord from 'discord.js';

export default async function statistic(
    message: Discord.Message
): Promise<void> {
    const { client, channel } = message;
    const guildCount = client.guilds.cache.size;
    const guildData = client.guilds.cache.map(guild => {
        let memberCountString = guild.memberCount.toString();
        while (memberCountString.length < 6) {
            memberCountString = ` ${memberCountString}`;
        }
        return `${guild.id}|      ${memberCountString}|${guild.name}`;
    });

    await Promise.all(
        new Array(Math.ceil(guildData.length / 20))
            .fill('')
            .map((_, i) =>
                channel.send(
                    `${
                        i === 0
                            ? `I am ${client.user?.toString()}, I am now serving in **${guildCount}** discord servers.\n\`\`\`Server Id         |Member Count|Server Name\n`
                            : '```'
                    }${guildData.slice(20 * i, 20 * i + 20).join('\n')}\`\`\``
                )
            )
    );
}
