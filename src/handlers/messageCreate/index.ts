import { Message } from 'discord.js';
import eightBall from 'community discord/8ball';
import { afkActivityListener, afkResponse } from 'community discord/afk';
import chatRevivePing from 'community discord/chatrevivePing';
import validateCrewAds from 'community discord/checkCrewAds';
import cleverBot from 'community discord/cleverbot';
import chatCoins from 'community discord/currency/chatCoins';
import { pokeballTrap } from 'community discord/currency/fun commands/shush';
import voteReward from 'community discord/currency/voteReward';
import announceLastToLeaveVC from 'community discord/lastToLeaveVC';
import { autoReaction } from 'community discord/myEmoji';
import oneMinute from 'community discord/oneMinute';
import { autoClassCritRole } from 'community discord/rdRole';
import solveMathEquation from 'community discord/solveMathEquation';
import { hackDiscussionLogging } from 'community discord/moderation';
import voteAutoResponder from 'community discord/voteAutoResponder';
import { logError } from 'util/logMessage';
import channelIds from 'config/channelIds';
import { isCommunityDiscord } from 'config/guild';
import { isDev, isProd } from 'config/env';
import { claimCoinbomb } from 'community discord/currency/coinbomb';
import { rickBombOnCollect } from 'community discord/currency/fun commands/rickbomb';
import discordInviteLinkSpamAutoMod from 'community discord/moderation/forbidExternalInvite';
import welcomeReward from 'community discord/currency/welcomeReward';

export default async function messageCreate(message: Message): Promise<void> {
    const { channel, guild, author, client } = message;

    let asyncPromisesCapturer: Promise<void>[] = [];

    try {
        if (message.inGuild() && isProd && !author.bot) {
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                hackDiscussionLogging(message),
            ];
        }

        if (isCommunityDiscord(guild)) {
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                voteReward(message),
                announceLastToLeaveVC(message),
                chatCoins(message),
            ];
        }

        if (
            !author.bot &&
            message.inGuild() &&
            isCommunityDiscord(guild) &&
            !(
                (isProd &&
                    channel.id === channelIds['jackykit-playground-v2']) ||
                (isDev && channel.id !== channelIds['jackykit-playground-v2'])
            )
        ) {
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                welcomeReward(message),
                discordInviteLinkSpamAutoMod(message),
                autoClassCritRole(message),
                solveMathEquation(message),
                pokeballTrap(message),
                oneMinute(message),
                validateCrewAds(message),
                chatRevivePing(message),
                voteAutoResponder(message),
                eightBall(message),
                autoReaction(message),
                afkResponse(message),
                cleverBot(message),
                claimCoinbomb(message),
                rickBombOnCollect(message),
                afkActivityListener(message),
            ];
        }

        await Promise.all(asyncPromisesCapturer);
    } catch (err) {
        try {
            await message.reply(
                `Oops, something went wrong: ${(err as Error).message}`
            );
        } finally {
            await logError(client, err, 'client#messageCreate', message);
        }
    }
}
