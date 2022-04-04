import {
    ApplicationCommandDataResolvable,
    AutocompleteInteraction,
    ButtonInteraction,
    CommandInteraction,
    WebhookEditMessageOptions,
} from 'discord.js';
import cache, { Dice } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { getAscendingNumberArray } from 'register/commandData';
import bestMatchFollowUp, { updateSuggestions } from './util/bestMatchFollowUp';
import getBrandingEmbed from './util/getBrandingEmbed';
import getSuggestions from './util/getSuggestions';

const getMinClass = (target: Dice): number => {
    switch (target.rarity) {
        case 'Legendary':
            return 7;
        case 'Unique':
            return 5;
        case 'Rare':
            return 3;
        default:
            return 1;
    }
};

const getDiceInfo = (
    target: Dice,
    dieClassArg: number | null = 1,
    dieLevelArg: number | null = 1
): string | WebhookEditMessageOptions => {
    const minClass = getMinClass(target);
    const dieClass = dieClassArg ?? minClass;
    const dieLevel = dieLevelArg ?? 1;
    if (dieClassArg && dieClass < getMinClass(target)) {
        return `Class ${dieClass} is too low for ${target.name} as ${target.rarity} tier.`;
    }

    const atk =
        Math.round(
            (target.atk +
                target.cupAtk * (dieClass - minClass) +
                target.pupAtk * (dieLevel - 1)) *
                100
        ) / 100;
    const spd =
        Math.round(
            (target.spd +
                target.cupSpd * (dieClass - minClass) +
                target.pupSpd * (dieLevel - 1)) *
                100
        ) / 100;
    const eff1 =
        Math.round(
            (target.eff1 +
                target.cupEff1 * (dieClass - minClass) +
                target.pupEff1 * (dieLevel - 1)) *
                100
        ) / 100;
    const eff2 =
        Math.round(
            (target.eff2 +
                target.cupEff2 * (dieClass - minClass) +
                target.pupEff2 * (dieLevel - 1)) *
                100
        ) / 100;
     const eff3 =
        Math.round(
            (target.eff3 +
                target.cupEff3 * (dieClass - minClass) +
                target.pupEff3 * (dieLevel - 1)) *
                100
        ) / 100;

    return {
        embeds: [
            getBrandingEmbed('/wiki/dice_mechanics')
                .setTitle(`${target.name} Dice`)
                .setDescription(parsedText(target.detail))
                .setThumbnail(target.img)
                .addFields([
                    {
                        name: 'Attack Damage',
                        value: String(atk) || '-',
                        inline: true,
                    },
                    {
                        name: 'Type',
                        value: target.type,
                        inline: true,
                    },
                    {
                        name: 'Attack Speed',
                        value: spd ? `${spd}s` : '-',
                        inline: true,
                    },
                    {
                        name: 'Target',
                        value: target.target,
                        inline: true,
                    },
                    ...(!target.nameEff1 || target.nameEff1 === '-'
                        ? []
                        : [
                              {
                                  name: target.nameEff1,
                                  value: eff1 + target.unitEff1,
                                  inline: true,
                              },
                          ]),
                    ...(!target.nameEff2 || target.nameEff2 === '-'
                        ? []
                        : [
                              {
                                  name: target.nameEff2,
                                  value: eff2 + target.unitEff2,
                                  inline: true,
                              },
                          ]),
                    ...(!target.nameEff3 || target.nameEff3 === '-'
                        ? []
                        : [
                              {
                                  name: target.nameEff3,
                                  value: eff3 + target.unitEff3,
                                  inline: true,
                              },
                          ]),
                ]),
        ],
    };
};

export default async function dice(
    interaction: CommandInteraction
): Promise<void> {
    const { options } = interaction;

    if (
        await cooldown(interaction, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const dieName = options.getString('die', true);
    const dieClass = options.getInteger('class');
    const dieLevel = options.getInteger('level');
    const diceList = cache.dice;
    const die = diceList.find(
        ({ name }) => dieName.toLowerCase() === name.toLowerCase()
    );

    if (die) {
        await interaction.reply(getDiceInfo(die, dieClass, dieLevel));
        return;
    }

    await bestMatchFollowUp(
        interaction,
        dieName,
        diceList,
        ' is not a valid dice.'
    );
}

export async function diceSuggestionButton(
    interaction: ButtonInteraction
): Promise<void> {
    await updateSuggestions(interaction, cache.dice, getDiceInfo);
}

export async function diceNameSuggestion(
    interaction: AutocompleteInteraction
): Promise<void> {
    const dieName = interaction.options.getString('die', true).toLowerCase();
    await interaction.respond(getSuggestions(cache.dice, dieName));
}

export const commandData = (): ApplicationCommandDataResolvable => ({
    name: 'dice',
    description: 'get the information about a die',
    options: [
        {
            type: 'STRING',
            name: 'die',
            description: 'the name of the die',
            required: true,
            autocomplete: true,
        },
        {
            type: 'INTEGER',
            name: 'class',
            description: 'the class of the die',
            minValue: 1,
            maxValue: 15,
            choices: getAscendingNumberArray(15, 'Class'),
        },
        {
            type: 'INTEGER',
            name: 'level',
            description: 'the level of the die',
            minValue: 1,
            maxValue: 5,
            choices: getAscendingNumberArray(5, 'Level'),
        },
    ],
});
