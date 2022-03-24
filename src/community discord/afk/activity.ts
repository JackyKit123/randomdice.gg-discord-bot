import { isCommunityDiscord } from 'config/guild';
import { tier2RoleIds } from 'config/roleId';
import {
    GuildMember,
    GuildTextBasedChannel,
    Interaction,
    MessageReaction,
    PartialUser,
    TextBasedChannel,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import { setAfk } from './set';

const lastSeen = new Map<GuildMember, number>();
async function autoSetAfk(member: GuildMember) {
    if (!member.roles.cache.hasAny(...tier2RoleIds)) return;
    const memberLastSeen = lastSeen.get(member) ?? Date.now();

    if (Date.now() - memberLastSeen > 1000 * 60 * 15) {
        await setAfk(member, memberLastSeen, 'Auto Detected AFK');
    } else {
        lastSeen.set(member, memberLastSeen);
    }
}

async function removeAfk(member: GuildMember, channel: GuildTextBasedChannel) {
    if (channel.permissionsFor(member)?.has('SEND_MESSAGES')) {
        await channel.send(
            `Welcome back ${member}, I have removed your afk. We have missed you for **${parseMsIntoReadableText(
                Date.now() -
                    cache['discord_bot/community/afk'][member.id].timestamp
            )}**`
        );
    }
    await database.ref('discord_bot/community/afk').child(member.id).set(null);
    await member.setNickname(member.displayName.replace(/^\[AFK\] ?/, ''));
}

export default async function afkListener(
    arg: TextBasedChannel | MessageReaction | Interaction,
    user: User | PartialUser
): Promise<void> {
    let channel: TextBasedChannel | null = null;
    if (arg instanceof MessageReaction) {
        channel = arg.message.channel;
    } else if (arg instanceof Interaction) {
        channel = arg.channel;
    } else {
        channel = arg;
    }
    if (!channel || channel?.type === 'DM') return;
    const { guild } = channel;
    const member = guild.members.cache.get(user.id);
    if (!member || !isCommunityDiscord(guild)) return;

    if (
        Object.keys(cache['discord_bot/community/afk']).some(
            uid => uid === member.id
        )
    ) {
        await removeAfk(member, channel);
    } else {
        await autoSetAfk(member);
    }
}
