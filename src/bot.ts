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
import statistic from './dev-commands/stat';
import devHelp from './dev-commands/help';
import sendContact from './commands/sendContact';
import randomdeck from './commands/randomdeck';
import drawUntil from './commands/drawUntil';
import version from './dev-commands/version';
import cache, { fetchAll } from './helper/cache';
import validateCrewAds from './community discord/checkCrewAds';
import infoVC from './community discord/infoVC';
import eventPing from './community discord/eventping';
import lock from './community discord/lock';
import lfg from './community discord/lfg';
import custom from './community discord/custom commands/moon';
import setChannel from './community discord/ban appeal/setChannel';
import closeAppeal from './community discord/ban appeal/closeAppeal';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Discord.Client();
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
    await infoVC(client);
    await logMessage(client, bootMessage);
    // eslint-disable-next-line no-console
    console.log(bootMessage);
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
            !author.bot &&
            process.env.COMMUNITY_SERVER_ID === guild?.id &&
            process.env.NODE_ENV === 'production'
        ) {
            await lock(message);
            await lfg(message);
            await eventPing(message);
            await validateCrewAds(message);
            await custom(client, message);
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
                        `Hi! I am awake. But I don't understand your command for \`${command}\`. Did you mean to do \`.gg ${bestMatch.target}\`? You may answer \`Yes\` to execute the new command.`
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
                        `Hi! I am awake. But I don't understand your command for \`${command}\`. Need help? type \`.gg help\``
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

client.login(process.env.BOT_TOKEN);

process.on('exit', () => client.destroy());
