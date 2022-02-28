import {
    ButtonInteraction,
    CommandInteraction,
    Message,
    ReplyMessageOptions,
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
    messageOptions: ReplyMessageOptions | string
): Promise<Message<boolean>> {
    if (input instanceof Message) {
        return input.reply(messageOptions);
    }

    await input.deferReply();
    return transformApiMessage(input, await input.followUp(messageOptions));
}

export async function edit(
    input: Message | ButtonInteraction | CommandInteraction,
    messageOptions: ReplyMessageOptions | string
): Promise<Message<boolean> | APIMessage> {
    if (input instanceof Message) {
        return input.edit(messageOptions);
    }

    return transformApiMessage(input, await input.editReply(messageOptions));
}
