import { Message } from 'discord.js';
import eightBall from 'community discord/8ball';
import { afkResponse } from 'community discord/afk';
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
import { isCommunityDiscord, isDevTestDiscord } from 'config/guild';
import { isDev, isProd } from 'config/env';
import { claimCoinbomb } from 'community discord/currency/coinbomb';
import { rickBombOnCollect } from 'community discord/currency/fun commands/rickbomb';

export default async function messageCreate(message: Message): Promise<void> {
    const { content, channel, guild, author, client } = message;
    const [suffix, command] = content.split(' ');
    let asyncPromisesCapturer: Promise<void>[] = [];

    try {
        if (isProd) {
            if (message.inGuild()) {
                asyncPromisesCapturer = [
                    ...asyncPromisesCapturer,
                    hackDiscussionLogging(message),
                ];
            }
        }

        if (isCommunityDiscord(guild) && isProd) {
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
            ];
        }

        if (
            suffix === '.gg' &&
            !author.bot &&
            ((isDev && isDevTestDiscord(guild)) ||
                (isProd && !isDevTestDiscord(guild))) &&
            (!command ||
                [
                    'ping',
                    'register',
                    'unregister',
                    'postnow',
                    'post-now',
                    'dice',
                    'guide',
                    'deck',
                    'boss',
                    'battlefield',
                    'news',
                    'cardcalc',
                    'drawuntil',
                    'draw-until',
                    'randomdeck',
                    'help',
                    'website',
                    'app',
                    'invite',
                    'support',
                    'contact',
                ].includes(command.toLowerCase()))
        ) {
            await message.reply(
                '`.gg` suffix commands has been phased out. The new features has been replaced with slash `/` commands. The commands will remain the same but the prefix will be `/` instead of `.gg`. You will also need to have `USE_APPLICATION_COMMANDS` permission to be able to use the commands, if you lack permissions, you will need to ask the server admin to enable the permission. Type `/help` to see the list of commands.'
            );
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
