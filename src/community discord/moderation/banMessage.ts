import channelIds from 'config/channelIds';
import { Guild, GuildBan, MessageEmbed, User } from 'discord.js';
import { getModdingEntryFromAuditLog } from './modlog';

export async function sendBanMessage(
    guild: Guild,
    target: User,
    reason: string | null | undefined,
    moderator: User
): Promise<void> {
    const general = guild?.channels.cache.get(channelIds.general);

    if (!general?.isText()) return;
    await general.send({
        embeds: [
            new MessageEmbed()
                .setImage(
                    'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
                )
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setTitle(`${target.tag} Got banned`)
                .setColor('#ff0000')
                .setDescription(
                    `${target} got banned by ${moderator} for ||${
                        reason ?? 'no reason'
                    }||`
                ),
        ],
    });
}

export default async function banMessage(ban: GuildBan): Promise<void> {
    const entry = await getModdingEntryFromAuditLog(ban, 'MEMBER_BAN_ADD');
    const { guild } = ban;

    if (entry && entry.executor && entry.target) {
        await sendBanMessage(guild, entry.target, entry.reason, entry.executor);
    }
}
