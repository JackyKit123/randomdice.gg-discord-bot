import * as Discord from 'discord.js';

export default async function help(message: Discord.Message): Promise<void> {
    const { channel, author } = message;

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
                    '`.gg register <guide|news|list> <channel-mention>`',
                    '*Register channel to sync data from the website, the channel should be a standalone channel, do not sync multiple categories of data into the same channel. ".gg register list" will return a list of registered channels.*',
                    '`.gg postnow <guide|news>`',
                    '*Force syncing data from the website into your registered channels*',
                ].join('\n'),
            },
            {
                name: 'Information',
                value: [
                    '`.gg dice <Dice Name> [--class=?] [--level=?]`',
                    '*Show information about the dice, alias for arguments `-c=?` `-l=?`*',
                    '`.gg deck <PvP|Co-op|Crew> [page#]`',
                    '*Show the deck list, optional parameter to select the initial page*',
                    '`.gg guide <Guide Name|list>`',
                    '*Show the detail guide for a certain guide. ".gg register list" will return a list of guides\' name.*',
                    '`.gg boss <Boss Name>`',
                    '*Show information about the boss.*',
                    '`.gg randomtip`',
                    '*Show you a random tip*',
                ].join('\n'),
            },
            {
                name: 'Other Commands',
                value: [
                    '`.gg ping`',
                    '*Ping the bot (only available in DM or as `ADMINISTRATOR`)*',
                    '`.gg website [/path]`',
                    '*Send link to website, with optional path*',
                    '`.gg app`',
                    '*Send link to Google Play App*',
                    '`.gg support`',
                    '*Send information about ways to support randomdice.gg*',
                ].join('\n'),
            },
        ]);

    await author.send(helpMessage);
    if (channel.type === 'text')
        await channel.send(
            '`The list of commands has been sent to your via DM.`'
        );
}
