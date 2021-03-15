import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import help from './commands/help';
import postNow from './commands/postNow';
import { register, unregister } from './commands/register';
import updateListener from './helper/updateListener';
import sendLink from './commands/sendLinks';
import ping from './commands/ping';
import news from './commands/news';
import dice from './commands/dice';
import deck from './commands/deck';
import guide from './commands/guide';
import boss from './commands/boss';
import battlefield from './commands/battlefield';
import guildCreateHandler from './helper/guildCreateHandler';
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
import cache, { fetchAll } from './helper/cache';
import validateCrewAds from './community discord/checkCrewAds';
import raffle, { setTimerOnBoot } from './community discord/currency/raffle';
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
import report from './community discord/report';
import lfg from './community discord/lfg';
import validateOneWordStory from './community discord/oneworldstoryValidate';
import gtn from './community discord/gtn';
import welcomeReward from './community discord/currency/welcomeReward';
import balance from './community discord/currency/balance';
import profile from './community discord/currency/profile';
import coinflip from './community discord/currency/coinflip';
import voteReward from './community discord/currency/voteReward';
import currencyUpdate from './community discord/currency/update';
import prestige from './community discord/currency/prestige';
import share from './community discord/currency/share';
import givedice from './community discord/currency/giveDice';
import leaderboard from './community discord/currency/leaderboard';
import drawDice from './community discord/currency/drawDice';
import timed from './community discord/currency/timed';
import chatCoins from './community discord/currency/chatCoins';
import multiplier from './community discord/currency/multiplier';
import moon, {
    purgeRolesOnReboot,
} from './community discord/custom commands/moon';
import shush, { pokeballTrap } from './community discord/custom commands/shush';
import snipe, { snipeListener } from './community discord/snipe';
import setChannel from './community discord/ban appeal/setChannel';
import closeAppeal from './community discord/ban appeal/closeAppeal';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Discord.Client({ partials: ['MESSAGE'] });
admin.initializeApp({
    credential: admin.credential.cert({
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

const database = admin.database();
updateListener(client, database);

client.on('ready', async () => {
    // eslint-disable-next-line no-unused-expressions
    client.user?.setActivity('.gg help', {
        type: 'PLAYING',
    });
    const bootMessage = `Timestamp: ${new Date().toTimeString()}, bot is booted on ${
        process.env.NODE_ENV
    }`;
    fetchAll(database);
    await logMessage(client, bootMessage);
    // eslint-disable-next-line no-console
    console.log(bootMessage);
    await Promise.all([
        setTimerOnBoot(client, database),
        infoVC(client),
        purgeRolesOnReboot(client),
        fetchApps(client),
        fetchGeneralOnBoot(client),
    ]);
});

client.on('message', async function messageHandler(message) {
    const { content, channel, guild, author } = message;
    const [suffix, command] = content.split(' ');

    try {
        if (
            process.env.COMMUNITY_APPEAL_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            if (
                !author.bot &&
                channel.id ===
                    process.env.COMMUNITY_APPEAL_SERVER_WELCOME_CHANNEL_ID
            ) {
                await setChannel(client, message);
                return;
            }
            if (content.startsWith('!')) {
                await closeAppeal(client, message);
                return;
            }
            if (suffix === '.gg') {
                await author.send(
                    'Normal randomdice.gg command cannot be executed in the ban appeal discord.'
                );
            }
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
            chatRevivePing(message);
            validateCrewAds(message);
            pokeballTrap(message);
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
                case '!lfg':
                    await lfg(message);
                    break;
                case '!gtn':
                    await gtn(message);
                    break;
                case '!eventping':
                    await eventPing(message);
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
                case '!share':
                case '!give':
                    await share(message);
                    break;
                case '!dicegive':
                case '!givedice':
                    await givedice(message);
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
                case '!daily':
                case '!weekly':
                case '!monthly':
                    await timed(message);
                    break;
                case '!currency':
                    await currencyUpdate(message);
                    break;
                case '!multi':
                case '!multiplier':
                    await multiplier(message);
                    break;
                case '!moon':
                    await moon(client, message);
                    break;
                case '!shush':
                    await shush(message);
                    break;
                default:
            }
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

        if (
            !suffix
                .replace(/[^\040-\176\200-\377]/gi, '')
                .match(/^\\?\.gg\b/i) ||
            author.bot
        ) {
            return;
        }
        if (process.env.DEV_USERS_ID?.includes(author.id)) {
            switch (command?.toLowerCase()) {
                case 'createinvites':
                    await fetchInvites(client, message);
                    return;
                case 'setemoji':
                    await setEmoji(client, database, message);
                    return;
                case 'stat':
                    await statistic(client, channel);
                    return;
                case 'reboot':
                    await reboot(message);
                    return;
                case 'version':
                    await version(client, message);
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
                await register(client, message, database);
                break;
            }
            case 'unregister': {
                await unregister(message, database);
                break;
            }
            case 'postnow': {
                await postNow(message, client);
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
                await sendLink(client, message);
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
                    const sentMessage = await channel.send(
                        `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`? You may answer \`Yes\` to execute the new command.`,
                        {
                            disableMentions: 'all',
                        }
                    );
                    let answeredYes = false;
                    try {
                        const awaitedMessage = await channel.awaitMessages(
                            (newMessage: Discord.Message) =>
                                newMessage.author === message.author &&
                                !!newMessage.content
                                    .replace(/[^\040-\176\200-\377]/gi, '')
                                    .match(/^(y(es)?|no?|\\?\.gg ?)/i),
                            { time: 60000, max: 1, errors: ['time'] }
                        );
                        if (
                            awaitedMessage
                                .first()
                                ?.content.replace(/[^\040-\176\200-\377]/gi, '')
                                .match(/^y(es)?/i)
                        ) {
                            answeredYes = true;
                        }
                    } catch {
                        if (sentMessage.editable)
                            await sentMessage.edit(
                                `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`?`
                            );
                    }
                    if (answeredYes) {
                        const editedCommandString = content
                            .replace(/[^\040-\176\200-\377]/gi, '')
                            .replace(
                                `.gg ${command}`,
                                `.gg ${bestMatch.target}`
                            );
                        // eslint-disable-next-line no-param-reassign
                        message.content = editedCommandString;
                        client.emit('message', message);
                    } else if (sentMessage.editable) {
                        await sentMessage.edit(
                            `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`?`
                        );
                    }
                } else {
                    await channel.send(
                        `Hi! I am awake. But I don't understand your command for \`${command}\`. Need help? type \`.gg help\``,
                        {
                            disableMentions: 'all',
                        }
                    );
                }
            }
        }
    } catch (err) {
        try {
            await channel.send(`Oops, something went wrong: ${err.message}`);

            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${author.id}>`
                } : ${
                    err.stack || err.message || err
                }\nCommand Attempting to execute:\`${content}\``
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.on('guildCreate', guild => guildCreateHandler(client, guild));

client.on('messageReactionAdd', async (reaction, user) => {
    const { guild } = reaction.message;

    try {
        if (
            !user.bot &&
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            await closeApplication(
                reaction,
                user,
                (client.user as Discord.ClientUser).id
            );
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${
                    err.stack || err.message || err
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
        if (
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
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
                    err.stack || err.message || err
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
        if (
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
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
                    err.stack || err.message || err
                }\n when listening to message edition.`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.login(process.env.BOT_TOKEN);

process.on('exit', () => client.destroy());
