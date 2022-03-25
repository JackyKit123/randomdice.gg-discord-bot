import { isCommunityDiscord } from 'config/guild';
import { tier2RoleIds } from 'config/roleId';
import {
    GuildMember,
    GuildTextBasedChannel,
    Interaction,
    Message,
    MessageReaction,
    PartialUser,
    Typing,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import { suppressUnknownMessage } from 'util/suppressErrors';
import wait from 'util/wait';
import { setAfk } from './set';

const membersLastSeen = new Map<GuildMember, number>();
async function autoSetAfk(member: GuildMember) {
    if (!member.roles.cache.hasAny(...tier2RoleIds)) return;
    const lastActionTimestamp = Date.now();
    membersLastSeen.set(member, lastActionTimestamp);
    await wait(1000 * 60 * 15);
    if (membersLastSeen.get(member) === lastActionTimestamp) {
        await setAfk(member, lastActionTimestamp, 'Auto Detected AFK');
    }
}

async function removeAfk(member: GuildMember, channel: GuildTextBasedChannel) {
    const sentMessage = await channel.send(
        `Welcome back ${member}, I have removed your afk. We have missed you for **${parseMsIntoReadableText(
            Date.now() - cache['discord_bot/community/afk'][member.id].timestamp
        )}**`
    );
    await database.ref('discord_bot/community/afk').child(member.id).set(null);
    if (member.manageable)
        await member.setNickname(member.displayName.replace(/^\[AFK\] ?/, ''));
    await wait(1000 * 5);
    await sentMessage.delete().catch(suppressUnknownMessage);
}

async function afkListener(arg: Typing | Interaction | Message): Promise<void>;
async function afkListener(
    arg: MessageReaction,
    userArg: User | PartialUser
): Promise<void>;
async function afkListener(
    arg: Typing | MessageReaction | Interaction | Message,
    userArg: User | PartialUser | void
): Promise<void> {
    const channel =
        arg instanceof MessageReaction ? arg.message.channel : arg.channel;

    let user: User | PartialUser | void;
    if (arg instanceof Typing || arg instanceof Interaction) {
        user = arg.user;
    } else if (arg instanceof Message) {
        user = arg.author;
    } else if (arg instanceof MessageReaction) {
        user = userArg;
    }

    if (!channel || channel?.type === 'DM' || !user) return;
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
export default afkListener;
