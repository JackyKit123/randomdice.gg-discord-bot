import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function cardcalc(
    input: Message | CommandInteraction
): Promise<void> {
    const arg =
        input instanceof Message
            ? input.content.replace('.gg cardcalc', '').trim()
            : input.options.getInteger('waves') ?? 0;
    const waves = Number(arg);
    if (
        await cooldown(input, '.gg cardcalc', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    if (!Number.isInteger(waves) || Number(waves) < 0) {
        await reply(input, 'Waves argument must be a positive integer.');
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

    await reply(input, {
        embeds: [
            getBrandingEmbed()
                .setThumbnail(
                    'https://firebasestorage.googleapis.com/v0/b/random-dice-web.appspot.com/o/Box%20Images%2FCard%20Box?alt=media&token=19c0a784-306d-4cd9-9b6e-4985384796aa'
                )
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
            type: 4,
            name: 'waves',
            description: 'the waves count',
            required: true,
            minValue: 1,
        },
    ],
};
