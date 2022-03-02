import {
    ButtonInteraction,
    CommandInteraction,
    DiscordAPIError,
    Message,
    ReplyMessageOptions,
    WebhookEditMessageOptions,
} from 'discord.js';
import { APIMessage } from 'discord.js/node_modules/discord-api-types';

async function transformApiMessage(
    input: Message | ButtonInteraction | CommandInteraction,
    message: Message | APIMessage
): Promise<Message> {
    if (!(message instanceof Message)) {
        const { channel } = input;
        if (!channel) {
            throw new Error(
                'Reply message was not sent because the channel was not found'
            );
        }
        return channel.messages.fetch(message.id);
    }
    return message;
}

export async function reply(
    input: Message | ButtonInteraction | CommandInteraction,
    messageOptions: ReplyMessageOptions | string,
    ephemeral?: boolean
): Promise<Message<boolean>> {
    const finalOption = {
        ephemeral,
        ...(typeof messageOptions === 'string'
            ? { content: messageOptions }
            : messageOptions),
        allowedMentions: { repliedUser: false },
    };

    if (input instanceof Message) {
        if (ephemeral) {
            try {
                await input.author.send(finalOption);
            } catch (err) {
                if (
                    (err as DiscordAPIError).message ===
                    'Cannot send messages to this user'
                ) {
                    await input.reply(
                        'I am unable to DM you the message because you have disabled DMs, consider using slash `/` command or enabling DMs.'
                    );
                }
            }
        }
        return input.reply(finalOption);
    }

    await input.deferReply();
    return transformApiMessage(input, await input.followUp(finalOption));
}

export async function edit(
    input: Message | ButtonInteraction | CommandInteraction,
    messageOptions: string | WebhookEditMessageOptions
): Promise<Message<boolean>> {
    const finalOption = {
        ...(typeof messageOptions === 'string'
            ? { content: messageOptions }
            : messageOptions),
        allowedMentions: { repliedUser: false },
    };
    if (input instanceof Message) {
        return input.edit(finalOption);
    }

    return transformApiMessage(input, await input.editReply(finalOption));
}
