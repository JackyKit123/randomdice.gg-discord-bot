import {
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
} from 'discord.js';
import { removeAfkListener } from 'community discord/afk';
import logMessage from 'util/logMessage';
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
            await removeAfkListener(nonPartialReaction, user);
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when handling message reaction in ${
                guild ? `server ${guild.name}` : `DM with <@${user.id}>`
            } : ${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
