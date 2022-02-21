import Discord from 'discord.js';
import cooldown from '../util/cooldown';

export default async function cardcalc(message: Discord.Message) {
    const { channel, content } = message;
    const [command, arg] = content.split(' ');
    let waves = 0;
    if (
        await cooldown(message, command, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    if (
        !Number.isNaN(arg) &&
        Number.isInteger(Number(arg)) &&
        Number(arg) > 0
    ) {
        waves = Number(arg);
    } else {
        await channel.send('waves must be positive integer');
        return;
    }

    if (waves > 100000) {
        await channel.send('not feasible keep dreaming');
        return;
    }

    let cards = 0;
    if (waves <= 40) {
        const isMiniBossWave = waves % 5 === 3 || waves % 5 === 4; // check if mini boss wave
        cards += Math.floor(waves / 5) * 8; // 8 cards per 5 wave
        cards += waves % 5; // 1 card for each wave
        if (isMiniBossWave) {
            cards += 1; // 1 extra card for mini boss
        }
    } else {
        cards = 64; // 64 cards for 40 waves
        cards += Math.floor((waves - 40) / 2) * 8; // 8 cards per 2 waves
        cards += (waves - 40) % 2; // 1 card for each wave
    }

    await channel.send(
        `${cards} cards (${
            Math.round((cards / 40) * 1000) / 1000
        } chests, roughly ${
            Math.round((cards / 40) * 0.01 * 1000) / 1000
        } legendaries)`
    );
}
