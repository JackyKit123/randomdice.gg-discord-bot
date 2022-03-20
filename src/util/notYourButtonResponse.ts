import {
    ButtonInteraction,
    Message,
    MessageComponentInteraction,
} from 'discord.js';
import { suppressUnknownMessage } from './suppressErrors';

async function getMessageFromReference(
    message: Message
): Promise<Message | null> {
    const { reference, client } = message;
    if (!reference) return null;

    const { channelId, messageId } = reference;
    if (!messageId) return null;

    const channel = client.channels.cache.get(channelId);
    if (!channel?.isText()) return null;

    return channel.messages.fetch(messageId).catch(suppressUnknownMessage);
}

export default async function notYourButtonResponse(
    interaction: ButtonInteraction | MessageComponentInteraction
): Promise<void> {
    let buttonType = 'button';
    if (interaction.isMessageComponent()) {
        if (interaction.isSelectMenu()) {
            buttonType = 'menu';
        }
    }
    await interaction.reply({
        content: `This ${buttonType} is not for you, please initiate a new command`,
        ephemeral: true,
    });
}

export async function checkIfUserIsInteractionInitiator(
    interaction: ButtonInteraction | MessageComponentInteraction
): Promise<boolean> {
    const {
        user,
        client: { user: clientUser },
    } = interaction;

    if (!clientUser) return false;

    if (!interaction.inCachedGuild()) {
        return user.id === interaction.message.author.id;
    }

    const { message, member } = interaction;
    let { interaction: from } = message;

    let referencedMessage = await getMessageFromReference(message);

    while (referencedMessage) {
        ({ interaction: from } = referencedMessage);
        if (from?.user.id === clientUser.id) {
            // eslint-disable-next-line no-await-in-loop
            referencedMessage = await getMessageFromReference(
                referencedMessage
            );
        }
        break;
    }
    if (from?.user.id !== member.id) {
        if (!interaction.replied) await notYourButtonResponse(interaction);
        return false;
    }
    return true;
}
