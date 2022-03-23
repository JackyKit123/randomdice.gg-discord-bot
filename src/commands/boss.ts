import {
    ApplicationCommandDataResolvable,
    ButtonInteraction,
    CommandInteraction,
    ReplyMessageOptions,
} from 'discord.js';
import cache, { Boss } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { mapChoices } from 'register/commandData';
import bestMatchFollowUp, { updateSuggestions } from './util/bestMatchFollowUp';
import getBrandingEmbed from './util/getBrandingEmbed';

const getBossInfo = (target: Boss): string | ReplyMessageOptions => ({
    embeds: [
        getBrandingEmbed(`/wiki/boss_mechanics#${encodeURI(target.name)}`)
            .setTitle(target.name)
            .setThumbnail(target.img)
            .addFields(
                parsedText(target.desc)
                    .split('\n')
                    .filter(p => p !== '')
                    .map((desc, i) => ({
                        name: i === 0 ? 'Boss Mechanic' : '‎',
                        value: desc,
                    }))
            ),
    ],
});

export default async function boss(
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
    const bossName = options.getString('boss', true);
    const bossList = cache['wiki/boss'];
    const bossInfo = bossList.find(
        ({ name }) => name.toLowerCase() === bossName.toLowerCase()
    );

    if (bossInfo) {
        await interaction.reply(getBossInfo(bossInfo));
        return;
    }

    await bestMatchFollowUp(
        interaction,
        bossName,
        bossList,
        ' is not a valid boss.'
    );
}

export async function bossSuggestionButton(
    interaction: ButtonInteraction
): Promise<void> {
    await updateSuggestions(interaction, cache['wiki/boss'], getBossInfo);
}

export const commandData = (
    bossData: Boss[]
): ApplicationCommandDataResolvable => ({
    name: 'boss',
    description: 'get the information about a boss',
    options: [
        {
            type: 'STRING',
            name: 'boss',
            description: 'the name of the boss',
            required: true,
            choices: mapChoices(bossData),
        },
    ],
});
