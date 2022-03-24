import {
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
} from 'discord.js';
import { afkActivityListener } from 'community discord/afk';
import { logError } from 'util/logMessage';
import { isCommunityDiscord } from 'config/guild';
import { isProd } from 'config/env';

export default async function messageReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
): Promise<void> {
    const { guild, client } = reaction.message;
    const nonPartialReaction = reaction.partial
        ? await reaction.fetch()
        : reaction;

    try {
        if (!user.bot && isCommunityDiscord(guild) && isProd) {
            await afkActivityListener(nonPartialReaction, user);
        }
    } catch (err) {
        await logError(client, err, 'client#messageReactionAdd', reaction);
    }
}
