import Discord from 'discord.js';
import cooldown from '../util/cooldown';

export default async function contact(message: Discord.Message): Promise<void> {
    const developerList = process.env.DEV_USERS_ID?.split(',').map(
        id => `<@${id.trim()}>`
    );
    if (
        await cooldown(message, '.gg contact', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    if (!developerList) {
        throw new Error(
            'Unable to parse contact information for the developers.'
        );
    }
    const contactMessage =
        developerList.length > 1
            ? `The 'developers' of this bot and https://randomdice.gg are ${developerList.join(
                  ' '
              )}. You can reach the developers via admin@randomdice.gg or by joining the randomdice discord.`
            : `The developer of this bot and https://randomdice.gg is ${developerList[0]}. You can reach the developer via admin@randomdice.gg or by joining the randomdice discord.`;
    await message.channel.send(contactMessage);
    await message.channel.send(
        'The randomdice discord is https://discord.gg/ZrXRpZq2mq'
    );
}
