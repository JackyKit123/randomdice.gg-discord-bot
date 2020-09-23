import * as Discord from 'discord.js';

export default async function help(message: Discord.Message): Promise<void> {
    const { channel } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('List of Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/title_dice.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setDescription(
            'Here is a list commands, randomdice.gg bot suffix is `.gg`'
        )
        .addFields([
            {
                name:
                    'Configuration Commands (require MANAGE_CHANNEL permission)',
                value:
                    '`.gg register <guide|news|list> <channel-mention>` - register channel to sync data from the website, `list` will return a list of registered channels.\n' +
                    '`.gg postnow <guide|news>` - force syncing data from the website into your registered channels',
            },
            {
                name: 'Information',
                value:
                    '`.gg dice <Dice Name> [--class=?] [--level=?]` - show information about the dice, alias for arguments `-c` `-l`',
            },
            {
                name: 'Other Commands',
                value:
                    '`.gg ping` - ping the bot\n' +
                    '`.gg website [/path]` - send link to website, with optional path\n' +
                    '`.gg app` - send link to Google Play App',
            },
        ]);

    await channel.send(helpMessage);
}
