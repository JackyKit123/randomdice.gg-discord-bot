import { randomDiceIconUrl } from 'config/url';
import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply, edit } from 'util/typesafeReply';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function ping(
    input: Message | CommandInteraction
): Promise<void> {
    const timestamp = Date.now();

    if (
        await cooldown(input, '.gg ping', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const embed = getBrandingEmbed()
        .setThumbnail(randomDiceIconUrl)
        .setAuthor(null)
        .setTitle('Pong!');

    const sent = await reply(input, {
        embeds: [embed.setDescription(`Time elapsed: ...ms`)],
    });
    await edit(input instanceof CommandInteraction ? input : sent, {
        embeds: [
            embed.setDescription(`Time elapsed: ${Date.now() - timestamp}ms`),
        ],
    });
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'ping',
    description: 'ping the bot to see if it is online',
};
