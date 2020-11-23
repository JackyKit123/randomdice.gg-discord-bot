import * as Discord from 'discord.js';

export const commandList = [
    {
        category: 'Sync Data (require `MANAGE_CHANNEL` permission)',
        commands: [
            {
                command: '.gg register <guide|news|list> #channel',
                description:
                    'Register channel to sync data from the website, the channel should be a standalone channel, do not sync multiple categories of data into the same channel. ".gg register list" will return a list of registered channels.',
            },
            {
                command: '.gg unregister <guide|news>',
                description:
                    'Unregister the channel registered from `.gg register`',
            },
            {
                command: '.gg postnow <guide|news>',
                description:
                    'Force syncing data from the website into your registered channels',
            },
        ],
    },
    {
        category: 'Information',
        commands: [
            {
                command: '.gg news',
                description: 'Show the latest news for random dice',
            },
            {
                command: '.gg dice <Dice Name> [--class] [--level]',
                description:
                    'Show information about the dice, alias for arguments `-c` `-l`',
            },
            {
                command:
                    '.gg deck <PvP|Co-op|Crew> [--page] [--legendary=(c7|c8|c9|c10)]',
                description:
                    'Show the deck list, optional arguments to select page or show variations for different legendary class, alias for arguments `-p` `-l`',
            },
            {
                command: '.gg guide <Guide Name|list>',
                description:
                    'Show the detail guide for a certain guide. ".gg register list" will return a list of guides\' name.',
            },
            {
                command: '.gg boss <Boss Name>',
                description: 'Show information about the boss.',
            },
            {
                command: '.gg battlefield <Battlefield Name> [--level]',
                description:
                    'Show information about the battlefield. alias for arguments `-l`',
            },
            { command: '.gg randomtip', description: 'Show you a random tip' },
        ],
    },
    {
        category: 'Other Commands',
        commands: [
            {
                command: '.gg ping',
                description:
                    'Ping the bot (only available in DM or as `ADMINISTRATOR`)',
            },
            {
                command: '.gg invite',
                description: `Send link for invitation for <@!723917706641801316> to your server.`,
            },
            {
                command: '.gg website [/path]',
                description: 'Send link to website, with optional path',
            },
            { command: '.gg app', description: 'Send link to Google Play App' },
            {
                command: '.gg drawUntil <c7-c15>',
                description:
                    'Simulate draws and show the expected draws for certain legendary class',
            },
            {
                command: '.gg contact',
                description:
                    'Send contact information for the developer of this bot or the community website.',
            },
            {
                command: '.gg support',
                description:
                    'Send information about ways to support randomdice.gg',
            },
        ],
    },
];

export default async function help(message: Discord.Message): Promise<void> {
    const { channel, author } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('List of Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setDescription(
            'Here is a list commands, randomdice.gg bot suffix is `.gg`'
        )
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
    if (channel.type === 'text')
        await channel.send(
            '`The list of commands has been sent to your via DM.`'
        );
}
