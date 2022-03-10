import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { edit, reply } from 'util/typesafeReply';
import { getAscendingNumberArray } from 'register/commandData';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function drawUntil(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg drawuntil', {
            default: 30 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }

    const command =
        input instanceof Message
            ? input.content.replace(/^\.gg drawuntil ?/i, '')
            : 'c7';

    if (!command) {
        await reply(
            input,
            'How much do you want to simulate the draw? e.g. `.gg drawUntil c15`.'
        );
        return;
    }

    const targetClass =
        input instanceof Message
            ? Number(command.match(/^c?(\d+)/)?.[1])
            : input.options.getInteger('class') ?? 0;

    if (!targetClass || Number(targetClass) < 7 || Number(targetClass) > 15) {
        await reply(
            input,
            'Invalid argument. The range for drawUntil should be c7 - c15. e.g. `.gg drawUntil c15`'
        );
        return;
    }

    const sentMessage = await reply(input, 'Running Simulation...');
    const legendaryPoolSize = cache.dice.filter(
        d => d.rarity === 'Legendary'
    ).length;
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
                const target: { [legendaryClass: number]: number } = {
                    7: 1,
                    8: 1 + 2,
                    9: 1 + 2 + 4,
                    10: 1 + 2 + 4 + 10,
                    11: 1 + 2 + 4 + 10 + 20,
                    12: 1 + 2 + 4 + 10 + 20 + 50,
                    13: 1 + 2 + 4 + 10 + 20 + 50 + 100,
                    14: 1 + 2 + 4 + 10 + 20 + 50 + 100 + 150,
                    15: 1 + 2 + 4 + 10 + 20 + 50 + 100 + 150 + 200,
                };
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
                                    numberOfDrawsForFirstLegendary =
                                        numberOfDraws;
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

    const messageEmbed = getBrandingEmbed()
        .setTitle(`Legendary Draw Simulation`)
        .setDescription(
            `For a pool of ${legendaryPoolSize} Legendary. This is the result for the mean number of draws to achieve legendary class ${targetClass} after running ${simulationRuns} simulations.\n*Note: it runs a simulation instead of actual math equation, the result may differ slightly each time*`
        )
        .addField(
            `For first class ${targetClass} (from Legend Box / King's Legacy):`,
            String(LegendBoxFirst / simulationRuns)
        )
        .addField(
            `For all class ${targetClass} (from Legend Box / King's Legacy):`,
            String(LegendBoxAll / simulationRuns)
        )
        .addField(
            `For first class ${targetClass} (from opening Card Box)`,
            String(CardBoxFirst / simulationRuns)
        )
        .addField(
            `For all class ${targetClass} (from opening Card Box)`,
            String(CardBoxAll / simulationRuns)
        )
        .addField(
            `For first class ${targetClass} (from King's Birth / King's Death)`,
            String(KingsBirthFirst / simulationRuns)
        )
        .addField(
            `For all class ${targetClass} (from King's Birth / King's Death)`,
            String((KingsBirthAll * 2) / simulationRuns)
        );

    await edit(input instanceof CommandInteraction ? input : sentMessage, {
        embeds: [messageEmbed],
    });
}

export const commandData = (): ApplicationCommandData => ({
    name: 'draw-until',
    description:
        'simulate a draw until a certain legendary class die is earned',
    options: [
        {
            type: 4,
            name: 'class',
            description: 'the targeted class of the legendary die',
            required: true,
            minValue: 7,
            maxValue: 15,
            choices: getAscendingNumberArray(9, 'Level', 7),
        },
    ],
});
