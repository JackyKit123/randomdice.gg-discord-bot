import { CommandInteraction, WebhookEditMessageOptions } from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import yesNoButton from 'util/yesNoButton';

export default async function bestMatchFollowUp<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TValue extends { name: string } & Record<string, any>
>(
    interaction: CommandInteraction,
    originalValue: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listOfValues: TValue[],
    invalidMessage: string,
    followUp: (target?: TValue) => string | WebhookEditMessageOptions
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
        `${originalValue}${invalidMessage} Did you mean \`${bestMatch.target}\`?`,
        async button => {
            const newResponse = followUp(
                listOfValues.find(value => value.name === bestMatch.target)
            );
            await button.reply(newResponse);
        }
    );
}
