import {
    ButtonInteraction,
    CommandInteraction,
    WebhookEditMessageOptions,
} from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { checkIfUserIsInteractionInitiator } from 'util/notYourButtonResponse';
import yesNoButton from 'util/yesNoButton';

export default async function bestMatchFollowUp(
    interaction: CommandInteraction,
    originalValue: string,
    listOfValues: { name: string }[],
    invalidMessage: string
): Promise<void> {
    const { bestMatch } = stringSimilarity.findBestMatch(
        originalValue,
        listOfValues.map(({ name }) => name)
    );

    if (bestMatch.rating < 0.3) {
        await interaction.reply(`${originalValue}${invalidMessage}`);
        return;
    }

    await yesNoButton(
        interaction,
        `${originalValue}${invalidMessage}. Did you mean \`${bestMatch.target}\`?`
    );
}

export async function updateSuggestions<TValue extends { name: string }>(
    interaction: ButtonInteraction,
    listOfValues: TValue[],
    followUp: (target?: TValue) => string | WebhookEditMessageOptions
): Promise<void> {
    if (!(await checkIfUserIsInteractionInitiator(interaction))) return;

    const suggestion = interaction.message.content.match(
        /\. Did you mean `(.+)`\?$/
    )?.[1];
    if (!suggestion) {
        await interaction.reply({
            content:
                'This button is too old to be used anymore. Please initiate a new command.',
            ephemeral: true,
        });
        return;
    }
    const newResponse = followUp(
        listOfValues.find(value => value.name === suggestion)
    );
    await interaction.reply(newResponse);
}
