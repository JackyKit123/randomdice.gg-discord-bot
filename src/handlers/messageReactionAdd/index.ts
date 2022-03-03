import {
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User,
} from 'discord.js';
import { removeAfkListener } from 'community discord/afk';
import { closeApplication } from 'community discord/apply';
import { spyLogBanHandler } from 'community discord/spy';
import logMessage from 'dev-commands/logMessage';

export default async function messageReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
): Promise<void> {
    const { guild, client } = reaction.message;
    const nonPartialReaction = reaction.partial
        ? await reaction.fetch()
        : reaction;

    try {
        if (
            !user.bot &&
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            closeApplication(nonPartialReaction, user);
            spyLogBanHandler(nonPartialReaction, user);
            removeAfkListener(nonPartialReaction, user);
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
