import { CommandInteraction } from 'discord.js';

export default async function statistic(
    interaction: CommandInteraction
): Promise<void> {
    const { client, channel } = interaction;
    const guildCount = client.guilds.cache.size;
    const guildData = client.guilds.cache.map(guild => {
        let memberCountString = guild.memberCount.toString();
        while (memberCountString.length < 6) {
            memberCountString = ` ${memberCountString}`;
        }
        return `${guild.id}|      ${memberCountString}|${guild.name}`;
    });

    if (!channel) return;
    await interaction.reply(
        `I am ${client.user?.toString()}, I am now serving in **${guildCount}** discord servers.\n`
    );
    await Promise.all(
        new Array(Math.ceil(guildData.length / 20))
            .fill('')
            .map((_, i) =>
                channel.send(
                    `${
                        i === 0
                            ? `\`\`\`Server Id         |Member Count|Server Name\n`
                            : '```'
                    }${guildData.slice(20 * i, 20 * i + 20).join('\n')}\`\`\``
                )
            )
    );
}
