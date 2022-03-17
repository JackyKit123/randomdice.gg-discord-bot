import { randomDiceIconUrl } from 'config/url';
import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function ping(
    interaction: CommandInteraction
): Promise<void> {
    const timestamp = Date.now();

    if (
        await cooldown(interaction, {
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

    await interaction.reply({
        embeds: [embed.setDescription(`Time elapsed: ...ms`)],
    });
    await interaction.editReply({
        embeds: [
            embed.setDescription(`Time elapsed: ${Date.now() - timestamp}ms`),
        ],
    });
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'ping',
    description: 'ping the bot to see if it is online',
};
