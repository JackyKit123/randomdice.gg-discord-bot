import { cardBoxImageUrl } from 'config/url';
import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function cardcalc(
    interaction: CommandInteraction
): Promise<void> {
    const { options } = interaction;
    const waves = options.getInteger('waves', true);

    if (
        await cooldown(interaction, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    let cards = 0;
    if (waves <= 45) {
        const isMiniBossWave = waves % 5 === 3 || waves % 5 === 4; // check if mini boss wave
        cards += Math.floor(waves / 5) * 8; // 8 cards per 5 wave
        cards += waves % 5; // 1 card for each wave
        if (isMiniBossWave) {
            cards += 1; // 1 extra card for mini boss
        }
    } else {
        cards = 72; // 72 cards for 45 waves (add 8 for every new boss)
        cards += Math.floor((waves - 45) / 2) * 8; // 8 cards per 2 waves
        cards += ((waves - 45) % 2) * 2; // 2 card for each non boss wave
    }

    await interaction.reply({
        embeds: [
            getBrandingEmbed()
                .setThumbnail(cardBoxImageUrl)
                .addField('Cards earned', String(cards), true)
                .addField(
                    'Chests Obtained',
                    String(Math.floor(cards / 40)),
                    true
                )
                .addField(
                    'Estimated Amount of Legendary Dice found',
                    String(Math.round(cards / 40) * 0.01)
                ),
        ],
    });
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'cardcalc',
    description: 'calculate the amount of cards at certain waves count',
    options: [
        {
            type: 'INTEGER',
            name: 'waves',
            description: 'the waves count',
            required: true,
            minValue: 1,
        },
    ],
};
