import {
    AnyChannel,
    Channel,
    GuildMember,
    Message,
    Role,
    TextBasedChannel,
    ThreadMember,
    User,
} from 'discord.js';

export default function checkSendMessagePermission(
    channel: AnyChannel | undefined | null,
    user?: string | User | GuildMember | Role | Message<boolean> | ThreadMember
): channel is Channel & TextBasedChannel {
    if (!channel?.isText()) return false;
    if (channel.type === 'DM') return true;

    const {
        client: { user: clientUser },
    } = channel;

    const target = user ?? clientUser;
    if (!target) return false;

    if (channel.isThread()) {
        if (
            (!channel.joined && !channel.joinable) ||
            !channel.parent
                ?.permissionsFor(target)
                ?.has('SEND_MESSAGES_IN_THREADS')
        )
            return false;

        try {
            return true;
        } catch {
            return false;
        }
    }

    const channelPermission = channel.permissionsFor(target);
    return !!(
        channelPermission?.has('SEND_MESSAGES') &&
        channelPermission?.has('VIEW_CHANNEL')
    );
}
