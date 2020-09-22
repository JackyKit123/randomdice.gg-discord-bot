import * as Discord from 'discord.js';

export default async function sendLinks(message: Discord.Message) {
    const {channel, content} = message;
    const command = content.split(' ')[1];
    const path = content.split(' ')[2];

    try {
        switch (command) {
            case 'website':
                if (path?.startsWith('/')) {
                    await channel.send(
                        `https://randomdice.gg${encodeURI(path)}`
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
        }
    } catch (err) {
        throw err;
    }
}
