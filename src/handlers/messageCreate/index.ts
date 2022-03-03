import { Message } from 'discord.js';
import stringSimilarity from 'string-similarity';
import help from 'commands/help';
import eightBall from 'community discord/8ball';
import afk, { afkResponse } from 'community discord/afk';
import apply, { configApps } from 'community discord/apply';
import closeAppeal from 'community discord/ban appeal/closeAppeal';
import setChannel from 'community discord/ban appeal/setChannel';
import banMessage from 'community discord/banMessage';
import chatRevivePing from 'community discord/chatrevivePing';
import validateCrewAds from 'community discord/checkCrewAds';
import cleverBot from 'community discord/cleverbot';
import balance from 'util/getBalance';
import chatCoins from 'community discord/currency/chatCoins';
import { spawnCoinbomb } from 'community discord/currency/coinbomb';
import coinflip from 'community discord/currency/coinflip';
import currency from 'community discord/currency/currency';
import drawDice from 'community discord/currency/drawDice';
import bedtime from 'community discord/currency/fun commands/bedtime';
import bon from 'community discord/currency/fun commands/bon';
import clown from 'community discord/currency/fun commands/clown';
import moon from 'community discord/currency/fun commands/moon';
import givemoney from 'community discord/currency/fun commands/mudkipz';
import rickbomb from 'community discord/currency/fun commands/rickbomb';
import shush, {
    pokeballTrap,
    unShush,
} from 'community discord/currency/fun commands/shush';
import welcomerick from 'community discord/currency/fun commands/welcomerick';
import yomama from 'community discord/currency/fun commands/yomama';
import leaderboard from 'community discord/currency/leaderboard';
import multiplier from 'community discord/currency/multiplier';
import prestige from 'community discord/currency/prestige';
import profile from 'community discord/currency/profile';
import raffle from 'community discord/currency/raffle';
import timed from 'community discord/currency/timed';
import voteReward from 'community discord/currency/voteReward';
import customRole from 'community discord/customRole';
import eventPing from 'community discord/eventping';
import gtn from 'community discord/gtn';
import announceLastToLeaveVC from 'community discord/lastToLeaveVC';
import lfg from 'community discord/lfg';
import lock from 'community discord/lock';
import myEmoji, { autoReaction } from 'community discord/myEmoji';
import oneMinute from 'community discord/oneMinute';
import oneWordStoryValidate from 'community discord/oneWordStoryValidate';
import promote from 'community discord/promote';
import { autoRole, rdRole } from 'community discord/rdRole';
import report from 'community discord/report';
import snipe from 'community discord/snipe';
import solveMathEquation from 'community discord/solveMathEquation';
import spy from 'community discord/spy';
import timer, { hackwarnTimer } from 'community discord/timer';
import voteAutoResponder from 'community discord/voteAutoResponder';
import fetchInvites from 'dev-commands/fetchInvites';
import devHelp from 'dev-commands/help';
import logMessage from 'dev-commands/logMessage';
import reboot from 'dev-commands/reboot';
import setEmoji from 'dev-commands/setEmoji';
import statistic from 'dev-commands/stat';
import version from 'dev-commands/version';
import cache from 'util/cache';
import { baseCommands } from 'register/commandCase';
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
            member
        ) {
            if (
                (process.env.NODE_ENV === 'production' &&
                    channel.id === '804640084007321600') ||
                (process.env.NODE_ENV === 'development' &&
                    channel.id !== '804640084007321600')
            )
                return;
            switch (suffix?.toLowerCase()) {
                case '!snipe':
                case '!editsnipe':
                    await snipe(message);
                    break;
                case '!application':
                    await configApps(message);
                    break;
                case '!apply':
                    await apply(message);
                    break;
                case '!report':
                case '!closereport':
                    await report(message);
                    break;
                case '!lock':
                case '!unlock':
                    await lock(message);
                    break;
                case '!timer':
                    await timer(message);
                    break;
                case '!hackwarn':
                case '!!hackwarn':
                    await hackwarnTimer(message);
                    break;
                case '!lfg':
                    await lfg(message);
                    break;
                case '!gtn':
                    await gtn(message);
                    break;
                case '!eventping':
                    await eventPing(message);
                    break;
                case '!customrole':
                    await customRole(message);
                    break;
                case '!myemoji':
                    await myEmoji(message);
                    break;
                case '!myclass':
                case '!mycrit':
                    await rdRole(message);
                    break;
                case '!promote':
                case '!advertise':
                    await promote(message);
                    break;
                case 'dd':
                case '!drawdice':
                case '!dicedraw':
                    await drawDice(message);
                    break;
                case '!bal':
                case '!balance':
                    await balance(message, 'emit');
                    break;
                case '!rank':
                case '!profile':
                case '!stat':
                case '!p':
                    await profile(message);
                    break;
                case '!coinflip':
                case '!cf':
                    await coinflip(message);
                    break;
                case '!richest':
                case '!leaderboard':
                case '!lb':
                    await leaderboard(message);
                    break;
                case '!prestige':
                    await prestige(message);
                    break;
                case '!raffle':
                    await raffle(message);
                    break;
                case '!hourly':
                    await timed(message, 'hourly');
                    break;
                case '!daily':
                    await timed(message, 'daily');
                    break;
                case '!weekly':
                    await timed(message, 'weekly');
                    break;
                case '!monthly':
                    await timed(message, 'monthly');
                    break;
                case '!yearly':
                    await timed(message, 'yearly');
                    break;
                case '!currency':
                    await currency(message);
                    break;
                case '!coinbomb':
                    await spawnCoinbomb(message);
                    break;
                case '!multi':
                case '!multiplier':
                    await multiplier(message);
                    break;
                case '!bon':
                    await bon(message);
                    break;
                case '!welcomerick':
                    await welcomerick(message);
                    break;
                case '!afk':
                    afk(message);
                    break;
                case '!bedtime':
                    await bedtime(message);
                    break;
                case '!yomama':
                    await yomama(message);
                    break;
                case '!moon':
                    await moon(message);
                    break;
                case '!clown':
                    await clown(message);
                    break;
                case '!shush':
                    await shush(message);
                    break;
                case '!unshush':
                    await unShush(message);
                    break;
                case '!rickbomb':
                case '!rickcoin':
                    await rickbomb(message);
                    break;
                case '!givemoney':
                    await givemoney(message);
                    break;
                case '!help':
                    await help(message, true);
                    break;
                default:
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
        } else if (!(await baseCommands(message, command?.toLowerCase()))) {
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
