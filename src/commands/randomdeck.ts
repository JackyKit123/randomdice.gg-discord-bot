import { shuffleDice, shuffleDiceLegendary } from 'config/emojiId';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import { promisify } from 'util';
import cache from 'util/cache';
import cooldown from 'util/cooldown';

const wait = promisify(setTimeout);

export default async function RandomDeck(
    interaction: CommandInteraction
): Promise<void> {
    if (
        await cooldown(interaction, {
            default: 20 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }
    const emoji = cache['discord_bot/emoji'];
    const shuffleArray = Object.keys(emoji)
        .filter(key => key !== '-1' && key !== '71')
        .map(key => Number(key)) as number[];
    shuffleArray.forEach((_, i) => {
        const random = Math.floor(Math.random() * i);
        [shuffleArray[i], shuffleArray[random]] = [
            shuffleArray[random],
            shuffleArray[i],
        ];
    });
    const pick5dice = shuffleArray.slice(0, 5).map(id => emoji[id]);

    const getShuffleAnimation = () =>
        Array(5)
            .fill(0)
            .map(() =>
                Math.random() > 0.5 ? shuffleDiceLegendary : shuffleDice
            );

    await interaction.reply(getShuffleAnimation().join(''));
    for (let x = 1; x <= 5; x += 1) {
        // eslint-disable-next-line no-await-in-loop
        await wait(300);
        // eslint-disable-next-line no-await-in-loop
        await interaction.editReply(
            [...pick5dice.slice(0, x), ...getShuffleAnimation().slice(x)].join(
                ''
            )
        );
    }
}

export const commandData: ApplicationCommandData = {
    name: 'randomdeck',
    description: 'Generate a random deck',
};
