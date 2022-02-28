import logMessage from 'dev-commands/logMessage';
import {
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    ReplyMessageOptions,
} from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { edit, reply } from './typesafeReply';

export default async function bestMatchFollowUp(
    input: Message | CommandInteraction,
    originalValue: string,
    allPossibleValues: string[],
    invalidMessage: string,
    newMatch: (match: string) => string | ReplyMessageOptions
): Promise<void> {
    const { bestMatch } = stringSimilarity.findBestMatch(
        originalValue,
        allPossibleValues
    );

    if (bestMatch.rating < 0.3) {
        await reply(input, `${originalValue}${invalidMessage}`);
        return;
    }

    const sentMessage = await reply(input, {
        content: `${originalValue}${invalidMessage} Did you mean \`${bestMatch.target}\`?`,
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('yes')
                    .setLabel('Yes')
                    .setEmoji('✅')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('no')
                    .setLabel('No')
                    .setEmoji('❌')
                    .setStyle('DANGER'),
            ]),
        ],
    });

    let answeredYes = false;

    sentMessage
        .createMessageComponentCollector({
            time: 60000,
        })
        .on('collect', async collected => {
            try {
                if (
                    collected.user.id !==
                    (
                        (input as Message).author ||
                        (input as CommandInteraction).user
                    ).id
                ) {
                    collected.reply({
                        content:
                            'You cannot use this button because you did not initiate this command.',
                        ephemeral: true,
                    });
                    return;
                }
                if (collected.customId === 'yes') {
                    answeredYes = true;
                    const newResponse = newMatch(bestMatch.target);
                    const messageOption =
                        typeof newResponse === 'string'
                            ? { content: newResponse, components: [] }
                            : {
                                  ...newResponse,
                                  components: [],
                                  content: undefined,
                              };
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        messageOption
                    );
                } else if (collected.customId === 'no') {
                    await sentMessage.delete();
                }
            } catch (err) {
                try {
                    await logMessage(
                        input.client,
                        `Oops, something went wrong in <#${
                            input.channelId
                        }> : ${
                            (err as Error).stack ??
                            (err as Error).message ??
                            err
                        }\n while collecting message component.`
                    );
                } catch (criticalError) {
                    // eslint-disable-next-line no-console
                    console.error(criticalError);
                }
            }
        })
        .on('end', async () => {
            if (!answeredYes) {
                try {
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        invalidMessage
                    );
                } catch (err) {
                    try {
                        await logMessage(
                            input.client,
                            `Oops, something went wrong in <#${
                                input.channelId
                            }> : ${
                                (err as Error).stack ??
                                (err as Error).message ??
                                err
                            }\n while collecting message component.`
                        );
                    } catch (criticalError) {
                        // eslint-disable-next-line no-console
                        console.error(criticalError);
                    }
                }
            }
        });
}
