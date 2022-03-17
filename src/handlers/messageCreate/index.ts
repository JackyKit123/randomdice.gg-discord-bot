import { Message } from 'discord.js';
import stringSimilarity from 'string-similarity';
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
import spy from 'community discord/spy';
import voteAutoResponder from 'community discord/voteAutoResponder';
import logMessage from 'util/logMessage';
import cache from 'util/cache';
import { baseCommands } from 'register/commandCase';
import yesNoButton from 'util/yesNoButton';
import channelIds from 'config/channelIds';
import { isCommunityDiscord, isDevTestDiscord } from 'config/guild';
import { isDev, isProd } from 'config/env';

export default async function messageCreate(message: Message): Promise<void> {
    const { content, channel, guild, author, member, client } = message;
    const [suffix, command] = content.split(' ');
    let asyncPromisesCapturer: Promise<void>[] = [];

    try {
        if (isProd) {
            asyncPromisesCapturer = [...asyncPromisesCapturer, spy(message)];
        }

        if (isCommunityDiscord(guild) && isProd) {
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                voteReward(message),
                announceLastToLeaveVC(message),
            ];
        }
        if (
            !author.bot &&
            isCommunityDiscord(guild) &&
            member &&
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
                chatCoins(message),
            ];
        }

        if (
            /^\.gg ?/i.test(suffix) &&
            !author.bot &&
            ((isDev && isDevTestDiscord(guild)) ||
                (isProd && !isDevTestDiscord(guild)))
        ) {
            if (!command?.toLowerCase()) {
                await message.reply(
                    'Hi! I am awake and I am listening to your commands. Need help? type `.gg help`'
                );
            } else if (
                (await baseCommands(message, command?.toLowerCase())) ===
                'no match'
            ) {
                const listOfCommands = Object.values(
                    cache['discord_bot/help']
                ).flatMap(category =>
                    category.commands.map(cmd => cmd.command.split(' ')[1])
                );
                const { bestMatch } = stringSimilarity.findBestMatch(
                    command,
                    listOfCommands
                );
                const warningString = `Hi! I am awake. But \`${command}\` is not a command.`;
                if (bestMatch.rating >= 0.5) {
                    await yesNoButton(
                        message,
                        `${warningString} Did you mean to do \`.gg ${bestMatch.target}\`?`,
                        async sentMessage => {
                            const editedCommandString = content.replace(
                                `.gg ${command}`,
                                `.gg ${bestMatch.target}`
                            );
                            // eslint-disable-next-line no-param-reassign
                            message.content = editedCommandString;
                            await sentMessage.delete();
                            client.emit('messageCreate', message);
                        }
                    );
                } else {
                    await message.reply(
                        `${warningString} Need help? type \`.gg help\``
                    );
                }
            } else {
                await channel.send(
                    '.gg commands will be phased out soon. The new features will soon be replaced with slash `/` commands. The commands will remain the same but the prefix will be `/` instead of `.gg`. You will also need to have `USE_APPLICATION_COMMANDS` permission to be able to use the commands, if you lack permissions, you will need to ask the server admin to enable the permission. For now, you can still use the commands by typing `.gg`, but new features will be replaced with slash commands. You can also use the slash commands by typing `/`. To stop seeing this message, you can start sending the commands with slash commands'
                );
            }
        }
        await Promise.all(asyncPromisesCapturer);
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when attempting to execute:\`${content}\` in ${
                guild ? `server ${guild.name}` : `DM with <@${author.id}>`
            } : ${(err as Error).stack ?? (err as Error).message ?? err}`
        );
        await message.reply(
            `Oops, something went wrong: ${(err as Error).message}`
        );
    }
}
