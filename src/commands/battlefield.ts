import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    ReplyMessageOptions,
} from 'discord.js';
import cache, { Battlefield } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { getAscendingNumberArray, mapChoices } from 'register/commandData';
import bestMatchFollowUp from './util/bestMatchFollowUp';
import getBrandingEmbed from './util/getBrandingEmbed';

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
    const battlefieldList = cache['wiki/battlefield'];
    const battlefieldName = options.getString('battlefield', true);
    const battlefield = battlefieldList.find(
        ({ name }) => battlefieldName.toLowerCase() === name.toLowerCase()
    );

    const getBattlefieldInfo = (
        target?: Battlefield
    ): string | ReplyMessageOptions => {
        if (!target) return 'No battlefield found.';

        const battlefieldLevel = options.getInteger('level') ?? 1;
        const desc = parsedText(target.desc);

        return {
            embeds: [
                getBrandingEmbed(`/wiki/battlefield#${encodeURI(target.name)}`)
                    .setTitle(target.name)
                    .setImage(target.img)
                    .setDescription(desc)
                    .addField(
                        target.buffName,
                        `${
                            Math.round(
                                (target.buffValue +
                                    target.buffCupValue *
                                        (battlefieldLevel - 1)) *
                                    100
                            ) / 100
                        }${target.buffUnit}`
                    )
                    .addField('Obtained From', target.source),
            ],
        };
    };

    if (battlefield) {
        await interaction.reply(getBattlefieldInfo(battlefield));
        return;
    }

    await bestMatchFollowUp(
        interaction,
        battlefieldName,
        battlefieldList,
        ' is not a valid battlefield.',
        getBattlefieldInfo
    );
}

export const commandData = (
    battlefield: Battlefield[]
): ApplicationCommandDataResolvable => ({
    name: 'battlefield',
    description: 'get the information about a battlefield',
    options: [
        {
            type: 'STRING',
            name: 'battlefield',
            description: 'the name of the battlefield',
            required: true,
            choices: mapChoices(battlefield),
        },
        {
            type: 'INTEGER',
            name: 'level',
            description: 'the level of the battlefield',
            minValue: 1,
            maxValue: 20,
            choices: getAscendingNumberArray(20, 'Level'),
        },
    ],
});
