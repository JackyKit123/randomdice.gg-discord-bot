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
                name: 'Sync Data (require MANAGE_CHANNEL permission)',
                value: [
                    '`.gg register <guide|news|list> <channel-mention>` - register channel to sync data from the website, ".gg register list" will return a list of registered channels.',
                    '`.gg postnow <guide|news>` - force syncing data from the website into your registered channels',
                ].join('\n'),
            },
            {
                name: 'Information',
                value: [
                    '`.gg dice <Dice Name> [--class=?] [--level=?]` - show information about the dice, alias for arguments `-c` `-l`',
                    '`.gg deck <PvP|Co-op|Crew> [page#]` - show the deck list, optional parameter to select the initial page',
                    '`.gg guide <Guide Name|list>` - show the detail guide for a certain guide. ".gg register list" will return a list of guides\' name.',
                    '`.gg boss <Boss Name>` - show information about the boss.',
                    '`.gg randomtip` - show you a random tip',
                ].join('\n'),
            },
            {
                name: 'Other Commands',
                value: [
                    '`.gg ping` - ping the bot (only available in DM or as `ADMINISTRATOR`)',
                    '`.gg website [/path]` - send link to website, with optional path',
                    '`.gg app` - send link to Google Play App',
                    '`.gg support` - send information about ways to support randomdice.gg',
                ].join('\n'),
            },
        ]);

    await channel.send(helpMessage);
}
