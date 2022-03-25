import { Message } from 'discord.js';
import cache from 'util/cache';
import { suppressUnknownMessage } from 'util/suppressErrors';
import wait from 'util/wait';
import { getAfkEmbed } from '.';

export default async function afkResponse(
    message: Message<true>
): Promise<void> {
    const { member, mentions, channel } = message;
    if (!member || !mentions.members?.size) return;

    const afkMembersMentioned = mentions.members.filter(
        m =>
            !!cache['discord_bot/community/afk'][m.id] &&
            member.permissionsIn(channel).has('VIEW_CHANNEL')
    );

    if (!afkMembersMentioned.size) return;

    const embeds = afkMembersMentioned.map(m => {
        const { afkMessage, timestamp } =
            cache['discord_bot/community/afk'][m.id];
        return getAfkEmbed(m, afkMessage, timestamp);
    });
    const sentMessage = await message.reply({
        embeds,
    });
    await wait(1000 * 10);
    await sentMessage.delete().catch(suppressUnknownMessage);
}
