import logMessage from 'dev-commands/logMessage';
import {
    CommandInteraction,
    DiscordAPIError,
    Message,
    WebhookEditMessageOptions,
} from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { edit, reply } from './typesafeReply';
import yesNoButton from './yesNoButton';

export default async function bestMatchFollowUp<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TValue extends { name: string } & Record<string, any>
>(
    input: Message | CommandInteraction,
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
        await reply(input, `${originalValue}${invalidMessage}`);
        return;
    }

    await yesNoButton(
        input,
        `${originalValue}${invalidMessage} Did you mean \`${bestMatch.target}\`?`,
        async sentMessage => {
            const newResponse = followUp(
                listOfValues.find(value => value.name === bestMatch.target)
            );
            const messageOption: WebhookEditMessageOptions =
                typeof newResponse === 'string'
                    ? { content: newResponse, components: [] }
                    : {
                          ...newResponse,
                          components: [],
                          content: undefined,
                      };

            try {
                await edit(
                    input instanceof CommandInteraction ? input : sentMessage,
                    messageOption
                );
            } catch (err) {
                await reply(
                    input instanceof CommandInteraction ? input : sentMessage,
                    `Oops! Something went wrong: ${
                        (err as DiscordAPIError).message
                    }`
                );
                await logMessage(
                    input.client,
                    `Oops, something went wrong in while collecting message component.<#${
                        input.channelId
                    }> : ${
                        (err as Error).stack ?? (err as Error).message ?? err
                    }\n `
                );
            }
        }
    );
}
