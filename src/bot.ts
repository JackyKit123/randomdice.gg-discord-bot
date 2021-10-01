import Discord from 'discord.js';
import firebase from 'firebase-admin';
import stringSimilarity from 'string-similarity';
import help from './commands/help';
import postNow from './commands/postNow';
import { register, unregister } from './commands/register';
import updateListener from './util/updateListener';
import sendLink from './commands/sendLinks';
import ping from './commands/ping';
import news from './commands/news';
import dice from './commands/dice';
import deck from './commands/deck';
import guide from './commands/guide';
import boss from './commands/boss';
import battlefield from './commands/battlefield';
import guildCreateHandler from './util/guildCreateHandler';
import logMessage from './dev-commands/logMessage';
import fetchInvites from './dev-commands/fetchInvites';
import setEmoji from './dev-commands/updateEmoji';
import reboot from './dev-commands/reboot';
import statistic from './dev-commands/stat';
import devHelp from './dev-commands/help';
import sendContact from './commands/sendContact';
import randomdeck from './commands/randomdeck';
import drawUntil from './commands/drawUntil';
import version from './dev-commands/version';
import cache, { fetchAll } from './util/cache';
import validateCrewAds, {
    fetchExistingCrewAds,
} from './community discord/checkCrewAds';
import banMessage from './community discord/banMessage';
import raffle, {
    setRaffleTimerOnBoot,
} from './community discord/currency/raffle';
import infoVC from './community discord/infoVC';
import apply, {
    closeApplication,
    fetchApps,
    configApps,
} from './community discord/apply';
import eventPing from './community discord/eventping';
import chatRevivePing, {
    fetchGeneralOnBoot,
} from './community discord/chatrevivePing';
import lock from './community discord/lock';
import timer, { registerTimer } from './community discord/timer';
import promote from './community discord/promote';
import oneMinute from './community discord/oneMinute';
import report from './community discord/report';
import lfg from './community discord/lfg';
import validateOneWordStory from './community discord/oneworldstoryValidate';
import voteAutoResponder from './community discord/voteAutoResponder';
import gtn from './community discord/gtn';
import customRole from './community discord/customRole';
import myEmoji, {
    autoReaction,
    fetchAutoReactionRegistry,
} from './community discord/myEmoji';
import eightBall from './community discord/8ball';
import solveMathEquation from './community discord/solveMathEquation';
import spy, {
    fetchSpyLogOnBoot,
    spyLogBanHandler,
} from './community discord/spy';
import welcomeReward from './community discord/currency/welcomeReward';
import balance from './community discord/currency/balance';
import profile from './community discord/currency/profile';
import coinflip from './community discord/currency/coinflip';
import voteReward from './community discord/currency/voteReward';
import currencyUpdate from './community discord/currency/currency';
import prestige from './community discord/currency/prestige';
import {
    pickCoinsInit,
    spawnCoinbomb,
} from './community discord/currency/coinbomb';
import leaderboard, {
    weeklyAutoReset,
} from './community discord/currency/leaderboard';
import drawDice from './community discord/currency/drawDice';
import timed from './community discord/currency/timed';
import chatCoins from './community discord/currency/chatCoins';
import multiplier from './community discord/currency/multiplier';
import announceLastToLeaveVC from './community discord/lastToLeaveVC';
import shush, {
    unShush,
    pokeballTrap,
} from './community discord/currency/fun commands/shush';
import snipe, { snipeListener } from './community discord/snipe';
import myClass from './community discord/myclass';
import myCrit from './community discord/mycrit';
import bon from './community discord/currency/fun commands/bon';
import welcomerick from './community discord/currency/fun commands/welcomerick';
import bedtime from './community discord/currency/fun commands/bedtime';
import rickbomb from './community discord/currency/fun commands/rickbomb';
import yomama from './community discord/currency/fun commands/yomama';
import givemoney from './community discord/currency/fun commands/mudkipz';
import moon, {
    purgeRolesOnReboot as purgeMoonedRoles,
} from './community discord/currency/fun commands/moon';
import clown, {
    purgeRolesOnReboot as purgeClownRoles,
} from './community discord/currency/fun commands/clown';
import setChannel from './community discord/ban appeal/setChannel';
import closeAppeal from './community discord/ban appeal/closeAppeal';
import cleverBot from './community discord/cleverbot';
import afk, { afkResponse, removeAfkListener } from './community discord/afk';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Discord.Client({
    partials: ['MESSAGE', 'GUILD_MEMBER'],
    intents: [
        'GUILDS',
        'GUILD_BANS',
        'GUILD_EMOJIS_AND_STICKERS',
        'GUILD_INTEGRATIONS',
        'GUILD_WEBHOOKS',
        'GUILD_INVITES',
        'GUILD_VOICE_STATES',
        'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MESSAGE_TYPING',
        'DIRECT_MESSAGES',
        'DIRECT_MESSAGE_REACTIONS',
        'DIRECT_MESSAGE_TYPING',
    ],
});
firebase.initializeApp({
    credential: firebase.credential.cert({
        projectId: 'random-dice-web',
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(
            /\\n/g,
            '\n'
        ),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
    databaseURL: 'https://random-dice-web.firebaseio.com/',
    databaseAuthVariableOverride: {
        uid: 'discord-bot',
    },
});

const database = firebase.database();
updateListener(client, database);

client.on('ready', async () => {
    // eslint-disable-next-line no-unused-expressions
    client.user?.setActivity('.gg help', {
        type: 'PLAYING',
    });
    const bootMessage = `Timestamp: ${new Date().toTimeString()}, bot is booted on ${
        process.env.NODE_ENV
    }`;
    try {
        await logMessage(client, bootMessage);
        // eslint-disable-next-line no-console
        console.log(bootMessage);
        infoVC(client);
        purgeMoonedRoles(client);
        purgeClownRoles(client);
        fetchApps(client);
        fetchGeneralOnBoot(client);
        pickCoinsInit(client, database);
        fetchExistingCrewAds(client);
        fetchSpyLogOnBoot(client);
        await fetchAll(database);
        setRaffleTimerOnBoot(client, database);
        weeklyAutoReset(client);
        registerTimer(client);
        fetchAutoReactionRegistry(client);
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong in client#Ready : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('messageCreate', async message => {
    const { content, channel, guild, author } = message;
    const [suffix, command] = content.split(' ');

    try {
        if (process.env.NODE_ENV === 'production') {
            spy(message);
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
            chatCoins(message);
            welcomeReward(message);
            validateOneWordStory(message);
            voteReward(message);
            banMessage(message);
            announceLastToLeaveVC(message);
            cleverBot(message);
        }
        if (!author.bot && process.env.COMMUNITY_SERVER_ID === guild?.id) {
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
                    await timer(message, database);
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
                    await customRole(message, database);
                    break;
                case '!myemoji':
                    await myEmoji(message);
                    break;
                case '!myclass':
                    await myClass(message);
                    break;
                case '!mycrit':
                    await myCrit(message);
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
                    await currencyUpdate(message);
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
            solveMathEquation(message);
            pokeballTrap(message);
            oneMinute(message);
            validateCrewAds(message);
            chatRevivePing(message);
            voteAutoResponder(message);
            eightBall(message);
            autoReaction(message);
            afkResponse(message);
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
                    await setEmoji(message, database);
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
        switch (command?.toLowerCase()) {
            case 'ping': {
                await ping(message);
                break;
            }
            case 'register': {
                await register(message, database);
                break;
            }
            case 'unregister': {
                await unregister(message, database);
                break;
            }
            case 'postnow': {
                await postNow(message, database);
                break;
            }
            case 'dice': {
                await dice(message);
                break;
            }
            case 'guide': {
                await guide(message);
                break;
            }
            case 'deck': {
                await deck(message);
                break;
            }
            case 'boss': {
                await boss(message);
                break;
            }
            case 'battlefield': {
                await battlefield(message);
                break;
            }
            case 'news': {
                await news(message);
                break;
            }
            case 'drawuntil': {
                await drawUntil(message);
                break;
            }
            case 'randomdeck': {
                await randomdeck(message);
                break;
            }
            case 'help': {
                await help(message);
                break;
            }
            case 'website':
            case 'app':
            case 'invite':
            case 'support':
                await sendLink(message);
                break;
            case 'contact':
                await sendContact(message);
                break;
            case undefined:
            case '':
                await channel.send(
                    'Hi! I am awake and I am listening to your commands. Need help? type `.gg help`'
                );
                break;
            default: {
                const listOfCommands = Object.values(
                    cache['discord_bot/help']
                ).flatMap(category =>
                    category.commands.map(cmd => cmd.command.split(' ')[1])
                );
                const { bestMatch } = stringSimilarity.findBestMatch(
                    command,
                    listOfCommands
                );
                if (bestMatch.rating >= 0.5) {
                    const sentMessage = await channel.send({
                        content: `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`? You may answer \`Yes\` to execute the new command.`,
                        allowedMentions: {
                            parse: [],
                            users: [],
                            roles: [],
                        },
                    });
                    let answeredYes = false;
                    try {
                        const awaitedMessage = await channel.awaitMessages({
                            filter: (newMessage: Discord.Message) =>
                                newMessage.author === message.author &&
                                !!newMessage.content.match(
                                    /^(y(es)?|no?|\\?\.gg ?)/i
                                ),
                            time: 60000,
                            max: 1,
                            errors: ['time'],
                        });
                        if (awaitedMessage.first()?.content.match(/^y(es)?/i)) {
                            answeredYes = true;
                        }
                    } catch {
                        if (sentMessage.editable)
                            await sentMessage.edit(
                                `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`?`
                            );
                    }
                    if (answeredYes) {
                        const editedCommandString = content.replace(
                            `.gg ${command}`,
                            `.gg ${bestMatch.target}`
                        );
                        // eslint-disable-next-line no-param-reassign
                        message.content = editedCommandString;
                        client.emit('messageCreate', message);
                    } else if (sentMessage.editable) {
                        await sentMessage.edit(
                            `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`?`
                        );
                    }
                } else {
                    await channel.send({
                        content: `Hi! I am awake. But I don't understand your command for \`${command}\`. Need help? type \`.gg help\``,
                        allowedMentions: {
                            parse: [],
                            users: [],
                            roles: [],
                        },
                    });
                }
            }
        }
    } catch (err) {
        try {
            await channel.send(
                `Oops, something went wrong: ${(err as Error).message}`
            );

            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${author.id}>`
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\nCommand Attempting to execute:\`${content}\``
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('guildCreate', guild => guildCreateHandler(guild));

client.on('messageReactionAdd', async (reaction, user) => {
    const { guild } = reaction.message;
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
        try {
            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\n when handling message reaction.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('messageDelete', async message => {
    const { guild, author } = message;
    try {
        if (process.env.COMMUNITY_SERVER_ID === guild?.id) {
            await snipeListener('delete', message);
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong ${
                    // eslint-disable-next-line no-nested-ternary
                    guild
                        ? `in server ${guild.name}`
                        : author
                        ? `in DM with <@${author.id}>`
                        : ''
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\n when listening to message deletion.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('messageUpdate', async message => {
    const { guild, author } = message;
    try {
        if (process.env.COMMUNITY_SERVER_ID === guild?.id) {
            await snipeListener('edit', message);
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong ${
                    // eslint-disable-next-line no-nested-ternary
                    guild
                        ? `in server ${guild.name}`
                        : author
                        ? `in DM with <@${author.id}>`
                        : ''
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\n when listening to message edition.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('typingStart', async typing => {
    const { user, channel } = typing;
    try {
        if (!user.bot && process.env.NODE_ENV === 'production') {
            removeAfkListener(channel, user);
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong when listening to typing start event ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.login(process.env.BOT_TOKEN);

process.on('exit', () => client.destroy());
