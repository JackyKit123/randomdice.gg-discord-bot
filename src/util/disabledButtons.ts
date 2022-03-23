import {
    Collection,
    MessageActionRow,
    MessageAttachment,
    MessageEmbed,
} from 'discord.js';

export default function disableButtons(message: {
    content?: string;
    embeds?: MessageEmbed[];
    attachments?: MessageAttachment[] | Collection<string, MessageAttachment>;
    components?: MessageActionRow[];
}): {
    content?: string;
    embeds: MessageEmbed[];
    attachments: MessageAttachment[];
    components: MessageActionRow[];
} {
    const { content, embeds, components, attachments } = message;

    return {
        content: content || undefined,
        embeds: embeds ?? [],
        attachments: Array.isArray(attachments)
            ? attachments
            : attachments?.toJSON() ?? [],
        components:
            components?.map(row =>
                new MessageActionRow().setComponents(
                    row.components.map(component => component.setDisabled(true))
                )
            ) ?? [],
    };
}
