import * as Discord from 'discord.js';

export default async function sendLinks(
    message: Discord.Message
): Promise<void> {
    const { channel, content } = message;
    const [, command, ...args] = content.split(' ');

    switch (command) {
        case 'website':
            if (args[0]?.startsWith('/')) {
                await channel.send(
                    `https://randomdice.gg${encodeURI(args.join(' '))}`
                );
            } else {
                await channel.send('https://randomdice.gg/');
            }
            break;
        case 'app':
            await channel.send(
                'https://play.google.com/store/apps/details?id=gg.randomdice.twa'
            );
            break;
        case 'support':
            await channel.send(
                new Discord.MessageEmbed()
                    .setTitle('Support Us')
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/favicon.ico',
                        'https://randomdice.gg/'
                    )
                    .setColor('#6ba4a5')
                    .setDescription(
                        'You can support randomdice.gg by funding in patreon or contributing on github.'
                    )
                    .addFields([
                        {
                            name: 'Patreon',
                            value:
                                'https://www.patreon.com/RandomDiceCommunityWebsite',
                        },
                        {
                            name: 'Github',
                            value: 'https://github.randomdice.gg',
                        },
                    ])
            );
            break;
        default:
    }
}
