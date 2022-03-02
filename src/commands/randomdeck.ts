import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import { promisify } from 'util';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { edit, reply } from 'util/typesafeReply';

const wait = promisify(setTimeout);

export default async function RandomDeck(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg randomdeck', {
            default: 10 * 1000,
            donator: 2 * 1000,
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
    const pick5dice = shuffleArray
        .slice(0, 5)
        .map(id => emoji[id])
        .join('');
    const diceList = cache.dice;
    const shuffleAnimation = shuffleArray
        .slice(0, 5)
        .map(id =>
            diceList.find(d => d.id === id)?.rarity === 'Legendary'
                ? '<a:Dice_TierX_RandomLegend:867076479733334016>'
                : '<a:Dice_TierX_RandomCommon:830670733004242974>'
        )
        .join('');

    const sentMessage = await reply(input, shuffleAnimation);
    await wait(1000);
    await edit(input instanceof Message ? sentMessage : input, pick5dice);
}

export const commandData: ApplicationCommandData = {
    name: 'randomdeck',
    description: 'Generate a random deck',
};
