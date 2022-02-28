import {
    ButtonInteraction,
    CommandInteraction,
    Message,
    ReplyMessageOptions,
} from 'discord.js';
import { APIMessage } from 'discord.js/node_modules/discord-api-types';

export async function reply(
    input: Message | ButtonInteraction | CommandInteraction,
    messageOptions: ReplyMessageOptions
): Promise<Message<boolean> | void> {
    if (input instanceof Message) {
        return input.reply(messageOptions);
    }
    return input.reply(messageOptions);
}

export async function edit(
    input: Message | ButtonInteraction | CommandInteraction,
    messageOptions: ReplyMessageOptions
): Promise<Message<boolean> | APIMessage> {
    if (input instanceof Message) {
        return input.edit(messageOptions);
    }
    return input.editReply(messageOptions);
}
