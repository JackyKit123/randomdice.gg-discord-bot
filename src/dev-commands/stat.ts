import { ApplicationCommandData, CommandInteraction } from 'discord.js';

export default async function statistic(
    interaction: CommandInteraction
): Promise<void> {
    const {
        client: { guilds, users, user },
        channel,
        options,
    } = interaction;

    if (options.getString('env', true) !== process.env.NODE_ENV) return;

    const guildCount = guilds.cache.size;
    const userCount = users.cache.size;
    const guildData = guilds.cache.map(guild => {
        let memberCountString = guild.memberCount.toString();
        while (memberCountString.length < 6) {
            memberCountString = ` ${memberCountString}`;
        }
        return `${guild.id}|      ${memberCountString}|${guild.name}`;
    });

    if (!channel) return;
    await interaction.reply(
        `I am ${user}, I am now serving **${userCount}** users in **${guildCount}** discord servers.\n`
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

export const commandData: ApplicationCommandData = {
    name: 'statistic',
    description: 'Get the statistic of this bot.',
    options: [
        {
            name: 'env',
            description:
                'which environment of the bot should that respond from.',
            type: 'STRING',
            required: true,
            choices: [
                {
                    name: 'production',
                    value: 'production',
                },
                {
                    name: 'development',
                    value: 'development',
                },
            ],
        },
    ],
};
