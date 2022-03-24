import { Message } from 'discord.js';
import cache from 'util/cache';
import { getAfkEmbed } from '.';

export default async function afkResponse(
    message: Message<true>
): Promise<void> {
    const { member, mentions } = message;
    if (!member || !mentions.members?.size) return;

    const afkMembersMentioned = mentions.members.filter(
        m => !!cache['discord_bot/community/afk'][m.id]
    );

    if (!afkMembersMentioned.size) return;

    const embeds = afkMembersMentioned.map(m => {
        const { afkMessage, timestamp } =
            cache['discord_bot/community/afk'][m.id];
        return getAfkEmbed(m, timestamp, afkMessage);
    });
    await message.reply({
        content: `${[...afkMembersMentioned.values()].join(' ')} ${
            afkMembersMentioned.size >= 1 ? 'are' : 'is'
        } afk.`,
        embeds,
        allowedMentions: {
            users: [],
        },
    });
}
