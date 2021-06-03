import Discord from 'discord.js';
import cache from '../util/cache';
import cooldown from '../util/cooldown';

export default async function drawUntil(
    message: Discord.Message
): Promise<void> {
    const { content, channel } = message;

    if (
        await cooldown(message, '.gg drawuntil', {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }
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

    const sentMessage = await channel.send('Running Simulation...');
    const legendaryPoolSize = cache.dice.filter(d => d.rarity === 'Legendary')
        .length;
    const simulationRuns = 100;

    const [
        LegendBoxAll,
        LegendBoxFirst,
        CardBoxAll,
        CardBoxFirst,
        KingsBirthAll,
        KingsBirthFirst,
    ] = (
        await Promise.all(
            new Array(simulationRuns).fill([0, 0]).map(async () => {
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
                const draw = async (
                    mode: 'normal' | 'card box' | 'kings birth'
                ): Promise<[number, number]> => {
                    return new Promise(resolve => {
                        const legendaryOwned = new Array(
                            mode === 'kings birth'
                                ? Math.floor(legendaryPoolSize / 2)
                                : legendaryPoolSize
                        ).fill(0);
                        let numberOfDraws = 0;
                        let numberOfDrawsForFirstLegendary = 0;
                        while (
                            legendaryOwned.some(
                                amount => amount < target[targetClass]
                            )
                        ) {
                            numberOfDraws += 1;
                            if (mode !== 'card box' || Math.random() < 0.01) {
                                const drawRandom = Math.floor(
                                    Math.random() *
                                        (mode === 'kings birth'
                                            ? Math.floor(legendaryPoolSize / 2)
                                            : legendaryPoolSize)
                                );
                                legendaryOwned[drawRandom] += 1;
                                if (
                                    legendaryOwned[drawRandom] >=
                                        target[targetClass] &&
                                    numberOfDrawsForFirstLegendary === 0
                                ) {
                                    numberOfDrawsForFirstLegendary = numberOfDraws;
                                }
                            }
                        }
                        resolve([
                            numberOfDraws,
                            numberOfDrawsForFirstLegendary,
                        ]);
                    });
                };
                return Promise.all([
                    ...(await draw('normal')),
                    ...(await draw('card box')),
                    ...(await draw('kings birth')),
                ]);
            })
        )
    ).reduce(
        (accumulator, currentValue) =>
            accumulator.map((a, i) => a + currentValue[i]) as [
                number,
                number,
                number,
                number,
                number,
                number
            ]
    );

    const messageEmbed = new Discord.MessageEmbed()
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
            `For first class ${targetClass} (from Legend Box / King's Legacy):`,
            LegendBoxFirst / simulationRuns
        )
        .addField(
            `For all class ${targetClass} (from Legend Box / King's Legacy):`,
            LegendBoxAll / simulationRuns
        )
        .addField(
            `For first class ${targetClass} (from opening Card Box)`,
            CardBoxFirst / simulationRuns
        )
        .addField(
            `For all class ${targetClass} (from opening Card Box)`,
            CardBoxAll / simulationRuns
        )
        .addField(
            `For first class ${targetClass} (from King's Birth / King's Death)`,
            KingsBirthFirst / simulationRuns
        )
        .addField(
            `For all class ${targetClass} (from King's Birth / King's Death)`,
            (KingsBirthAll * 2) / simulationRuns
        );

    if (sentMessage.editable) {
        await sentMessage.edit('', messageEmbed);
    } else {
        await channel.send(messageEmbed);
    }
}
