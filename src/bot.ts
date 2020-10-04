import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import help, { commandList } from './commands/help';
import postNow from './commands/postNow';
import { register, unregister } from './commands/register';
import updateListener from './helper/updateListener';
import sendLink from './commands/sendLinks';
import ping from './commands/ping';
import dice from './commands/dice';
import deck from './commands/deck';
import guide from './commands/guide';
import boss from './commands/boss';
import randomTip from './commands/tip';
import guildCreateHandler from './helper/guildCreateHandler';
import logMessage from './dev-commands/logMessage';
import fetchInvites from './dev-commands/fetchInvites';
import setEmoji from './dev-commands/updateEmoji';
import devHelp from './dev-commands/help';
import sendContact from './commands/sendContact';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Discord.Client();
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: 'random-dice-web',
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
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

client.on('ready', () => {
    client.user?.setActivity('.gg help', {
        type: 'PLAYING',
    });
    const bootMessage = `Timestamp: ${new Date().toTimeString()}, bot is booted on ${
        process.env.NODE_ENV
    }`;
    logMessage(client, bootMessage);
    // eslint-disable-next-line no-console
    console.log(bootMessage);
});

client.on('message', async message => {
    const { content, channel, guild, author } = message;
    const [suffix, command] = content.split(' ');
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
        !suffix.replace(/[^\040-\176\200-\377]/gi, '').match(/^\\?\.gg\b/i) ||
        author.bot
    ) {
        return;
    }
    try {
        if (process.env.DEV_USERS_ID?.includes(author.id)) {
            switch (command?.toLowerCase()) {
                case 'createinvites':
                    await fetchInvites(client);
                    return;
                case 'setemoji':
                    await setEmoji(client, database, message);
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
                await postNow(message, client, database);
                break;
            }
            case 'dice': {
                await dice(message, database);
                break;
            }
            case 'guide': {
                await guide(message, database);
                break;
            }
            case 'deck': {
                await deck(message, database);
                break;
            }
            case 'boss': {
                await boss(message, database);
                break;
            }
            case 'help': {
                await help(message);
                break;
            }
            case 'randomtip': {
                await randomTip(message, database);
                break;
            }
            case 'website':
            case 'app':
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
                    commandList
                ).flatMap(category =>
                    category.commands.map(cmd => cmd.command.split(' ')[1])
                );
                const { bestMatch } = stringSimilarity.findBestMatch(
                    command,
                    listOfCommands
                );
                await channel.send(
                    `Hi! I am awake. But I don't understand your command for \`${command}\`. ${
                        bestMatch.rating >= 0.5
                            ? `Did you mean to do \`.gg ${bestMatch.target}\`?`
                            : 'Need help? type `.gg help`'
                    }`
                );
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
                    err.message
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
