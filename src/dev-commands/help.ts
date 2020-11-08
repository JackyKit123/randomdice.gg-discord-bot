import * as Discord from 'discord.js';

export const commandList = [
    {
        category: 'Config',
        commands: [
            {
                command: '.gg setEmoji <emoji> <Dice Name>',
                description: 'Set Emoji for a certain dice',
            },
        ],
    },
    {
        category: 'Statistic',
        commands: [
            {
                command: '.gg createInvites [guild id]',
                description:
                    'Create invite links and send to log channel for all servers that the bot live in, optional param to create invite for 1 single guild',
            },
            {
                command: '.gg stat',
                description:
                    'Show the member count and server count that the bot is serving.',
            },
        ],
    },
];

export default async function help(message: Discord.Message): Promise<void> {
    const { author } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('Developer Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setDescription('Here is a list commands for the bot developer.')
        .addFields(
            commandList.map(categories => ({
                name: categories.category,
                value: categories.commands
                    .map(
                        command =>
                            `\`${command.command}\`\n*${command.description}*`
                    )
                    .join('\n'),
            }))
        );

    await author.send(helpMessage);
}
