import * as Discord from 'discord.js';

export default async function sendLinks(
    message: Discord.Message
): Promise<void> {
    const { channel, content } = message;
    const [, command, path] = content.split(' ');

    switch (command) {
        case 'website':
            if (path?.startsWith('/')) {
                await channel.send(`https://randomdice.gg${encodeURI(path)}`);
            } else {
                await channel.send('https://randomdice.gg/');
            }
            break;
        case 'app':
            await channel.send(
                'https://play.google.com/store/apps/details?id=gg.randomdice.twa'
            );
            break;
        default:
    }
}
