import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { Dice } from '../helper/cache';

export default async function drawUntil(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { content, channel } = message;

    const command = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg drawuntil ?/i, '');

    if (!command) {
        await channel.send(
            'How much do you want to simulate the draw? e.g. `.gg drawUntil c15`.'
        );
        return;
    }

    const targetClass = Number(command.match(/^c?(\d+)/)?.[1]);

    if (!targetClass || Number(targetClass) < 7 || Number(targetClass) > 15) {
        await channel.send(
            'Invalid argument. The range for drawUntil should be c7 - c15. e.g. `.gg drawUntil c15`'
        );
        return;
    }

    const legendaryPoolSize = ((await cache(
        database,
        'dice'
    )) as Dice[]).filter(d => d.rarity === 'Legendary').length;
    const simulationRuns = 100;

    const [drawsForAll, drawsForFirst] = new Array(simulationRuns + 1)
        .fill([0, 0])
        .reduce(([accAll, accFirst]) => {
            const target = {
                7: 1,
                8: 1 + 2,
                9: 1 + 2 + 4,
                10: 1 + 2 + 4 + 10,
                11: 1 + 2 + 4 + 10 + 20,
                12: 1 + 2 + 4 + 10 + 20 + 50,
                13: 1 + 2 + 4 + 10 + 20 + 50 + 100,
                14: 1 + 2 + 4 + 10 + 20 + 50 + 100 + 150,
                15: 1 + 2 + 4 + 10 + 20 + 50 + 100 + 150 + 200,
            } as { [legendaryClass: number]: number };
            const legendaryOwned = new Array(legendaryPoolSize).fill(0);
            let numberOfDraws = 0;
            let numberOfDrawsForFirstLegendary = 0;
            while (
                legendaryOwned.some(amount => amount < target[targetClass])
            ) {
                const drawRandom = Math.floor(
                    Math.random() * legendaryPoolSize
                );
                legendaryOwned[drawRandom] += 1;
                numberOfDraws += 1;
                if (
                    legendaryOwned[drawRandom] >= target[targetClass] &&
                    numberOfDrawsForFirstLegendary === 0
                ) {
                    numberOfDrawsForFirstLegendary = numberOfDraws;
                }
            }
            return [
                accAll + numberOfDraws,
                accFirst + numberOfDrawsForFirstLegendary,
            ];
        });
    await channel.send(
        new Discord.MessageEmbed()
            .setTitle(`Legendary Draw Simulation`)
            .setDescription(
                `For a pool of ${legendaryPoolSize} Legendary. This is the result for the mean number of draws to achieve legendary class ${targetClass} after running ${simulationRuns} simulations.\n*Note: it runs a simulation instead of actual math equation, the result may differ slightly each time*`
            )
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/android-chrome-512x512.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setFooter(
                'randomdice.gg Draws Simulation',
                'https://randomdice.gg/android-chrome-512x512.png'
            )
            .addField(
                `For first class ${targetClass}:`,
                drawsForFirst / simulationRuns,
                true
            )
            .addField(
                `For all class ${targetClass}:`,
                drawsForAll / simulationRuns,
                true
            )
    );
}
