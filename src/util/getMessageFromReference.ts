import { ButtonInteraction, CommandInteraction, Message } from 'discord.js';

export default async function getMessageFromReference(
    message: Message,
    input?: CommandInteraction | ButtonInteraction
): Promise<Message | null> {
    const response = async (text: string) => {
        if (input) {
            await input.reply(text);
        } else {
            throw new Error(text);
        }
    };

    const { reference, client } = message;
    if (!reference) {
        await response('The message reference is missing');
        return null;
    }
    const { channelId, messageId } = reference;

    if (!messageId) {
        await response('The message id in reference is missing');
        return null;
    }

    const channel = client.channels.cache.get(channelId);

    if (!channel?.isText()) {
        await response('The channel is not a text channel');
        return null;
    }

    return channel.messages.fetch(messageId);
}
