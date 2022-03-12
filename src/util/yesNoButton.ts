import logMessage from 'util/logMessage';
import {
    ButtonInteraction,
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    ReplyMessageOptions,
} from 'discord.js';
import { edit, reply } from './typesafeReply';

export default async function yesNoButton(
    input: Message | CommandInteraction | ButtonInteraction,
    promptQuestion: string | ReplyMessageOptions,
    onYes: (sentMessage: Message) => unknown
): Promise<void> {
    const sentMessage = await reply(input, {
        ...(typeof promptQuestion === 'string'
            ? { content: promptQuestion }
            : promptQuestion),
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

    const collector = sentMessage.createMessageComponentCollector({
        time: 60000,
    });
    collector
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
                    await onYes(sentMessage);
                } else if (collected.customId === 'no') {
                    if (input instanceof Message) {
                        await sentMessage.delete();
                    } else {
                        await input.deleteReply();
                        collector.stop('answered no');
                    }
                }
            } catch (err) {
                await logMessage(
                    input.client,
                    'warning',
                    `Oops, something went wrong while collecting message component in <#${
                        input.channelId
                    }> : ${
                        (err as Error).stack ?? (err as Error).message ?? err
                    }`
                );
            }
        })
        .on('end', async (_, reason) => {
            if (!answeredYes && reason !== 'answered no') {
                try {
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        promptQuestion
                    );
                } catch (err) {
                    await logMessage(
                        input.client,
                        'warning',
                        `Oops, something went wrong while collecting message component in <#${
                            input.channelId
                        }> : ${
                            (err as Error).stack ??
                            (err as Error).message ??
                            err
                        }`
                    );
                }
            }
        });
}
