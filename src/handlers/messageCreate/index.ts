import { Message } from 'discord.js';
import stringSimilarity from 'string-similarity';
import eightBall from 'community discord/8ball';
import { afkResponse } from 'community discord/afk';
import closeAppeal from 'community discord/ban appeal/closeAppeal';
import setChannel from 'community discord/ban appeal/setChannel';
import banMessage from 'community discord/banMessage';
import chatRevivePing from 'community discord/chatrevivePing';
import validateCrewAds from 'community discord/checkCrewAds';
import cleverBot from 'community discord/cleverbot';
import chatCoins from 'community discord/currency/chatCoins';
import { pokeballTrap } from 'community discord/currency/fun commands/shush';
import voteReward from 'community discord/currency/voteReward';
import announceLastToLeaveVC from 'community discord/lastToLeaveVC';
import { autoReaction } from 'community discord/myEmoji';
import oneMinute from 'community discord/oneMinute';
import oneWordStoryValidate from 'community discord/oneWordStoryValidate';
import { autoRole } from 'community discord/rdRole';
import solveMathEquation from 'community discord/solveMathEquation';
import spy from 'community discord/spy';
import voteAutoResponder from 'community discord/voteAutoResponder';
import fetchInvites from 'dev-commands/fetchInvites';
import devHelp from 'dev-commands/help';
import logMessage from 'dev-commands/logMessage';
import reboot from 'dev-commands/reboot';
import setEmoji from 'dev-commands/setEmoji';
import statistic from 'dev-commands/stat';
import version from 'dev-commands/version';
import cache from 'util/cache';
import { baseCommands, communityServerCommands } from 'register/commandCase';
import yesNoButton from 'util/yesNoButton';
import { reply } from 'util/typesafeReply';

export default async function messageCreate(message: Message): Promise<void> {
    const { content, channel, guild, author, member, client } = message;
    const [suffix, command] = content.split(' ');
    let asyncPromisesCapturer: Promise<void>[] = [];

    try {
        if (process.env.NODE_ENV === 'production') {
            asyncPromisesCapturer = [...asyncPromisesCapturer, spy(message)];
        }

        if (
            process.env.COMMUNITY_APPEAL_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            if (content.startsWith('!')) {
                await closeAppeal(message);
                return;
            }
            await setChannel(message);
            return;
        }

        if (
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                oneWordStoryValidate(message),
                voteReward(message),
                banMessage(message),
                announceLastToLeaveVC(message),
            ];
        }
        if (
            !author.bot &&
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            member &&
            !(
                (process.env.NODE_ENV === 'production' &&
                    channel.id === '804640084007321600') ||
                (process.env.NODE_ENV === 'development' &&
                    channel.id !== '804640084007321600')
            )
        ) {
            if (suffix.startsWith('!')) {
                asyncPromisesCapturer.push(
                    communityServerCommands(
                        message,
                        suffix.replace(/^!/, '').toLowerCase()
                    )
                );
            }
            asyncPromisesCapturer = [
                ...asyncPromisesCapturer,
                autoRole(message),
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
            // ignoring other servers in development, ignoring dev channel in production
            (process.env.DEV_SERVER_ID &&
                process.env.NODE_ENV === 'development' &&
                guild?.id !== process.env.DEV_SERVER_ID) ||
            (process.env.NODE_ENV === 'production' &&
                guild?.id === process.env.DEV_SERVER_ID)
        ) {
            return;
        }

        if (!/^\.gg ?/i.test(suffix) || author.bot) {
            return;
        }
        if (process.env.DEV_USERS_ID?.includes(author.id)) {
            switch (command?.toLowerCase()) {
                case 'createinvites':
                    await fetchInvites(message);
                    return;
                case 'setemoji':
                    await setEmoji(message);
                    return;
                case 'stat':
                    await statistic(message);
                    return;
                case 'reboot':
                    await reboot(message);
                    return;
                case 'version':
                    await version(message);
                    return;
                case 'help':
                    await devHelp(message);
                    break;
                default:
            }
        }
        if (!command?.toLowerCase()) {
            await reply(
                message,
                'Hi! I am awake and I am listening to your commands. Need help? type `.gg help`'
            );
        } else if (
            (await baseCommands(message, command?.toLowerCase())) === 'no match'
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
                await reply(
                    message,
                    `${warningString} Need help? type \`.gg help\``
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
        await reply(
            message,
            `Oops, something went wrong: ${(err as Error).message}`
        );
    }
}
