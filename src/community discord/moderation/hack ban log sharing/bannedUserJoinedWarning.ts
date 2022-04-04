import { GuildMember, Message } from 'discord.js';
import { getRegisteredChannels } from '.';

export default async function warnOnBannedMemberJoin(
    member: GuildMember
): Promise<void> {
    const hacklog = await getRegisteredChannels(member.client);
    const channel = hacklog.get(member.guild);
    if (!channel) return;

    const messages =
        channel.messages.cache.size >= 100
            ? channel.messages.cache
            : await channel.messages.fetch({ limit: 100 });

    const memberAppearedInLog = new Map<GuildMember, Message>();
    messages.forEach(message => {
        if (
            message.embeds[0]?.footer?.text.match(
                /^User ID: (\d{18})$/
            )?.[1] === member.id
        ) {
            memberAppearedInLog.set(member, message);
        }
    });

    await Promise.all(
        [...memberAppearedInLog].map(async ([m, message]) =>
            message.reply(`${m} who just joined has appeared in a ban log.`)
        )
    );
}
