import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import help from './help';
import postNow from './postNow';
import register from './register';
import updateListener from './updateListener';
import sendLink from './sendLinks';
const client = new Discord.Client();
admin.initializeApp({ 
    credential: admin.credential.cert({
        projectId: 'random-dice-web',
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
    if ((process.env.NODE_ENV = 'development')) {
        (
            (client.channels.cache.get(
                '757766843502034977'
            ) as Discord.TextChannel) || undefined
        )?.send(`Bot is alive at ${new Date().toTimeString()}`);
    }
});

client.on('message', async (message) => {
    const {content, reply, channel} = message;
    const [suffix, command] = content.split(' ');
    if (suffix !== '.gg' || !command) {
        return;
    }
    try {
        switch (command.toLowerCase()) {
            case 'register': {
                await register(message, database);
                break;
            }
            case 'postnow': {
                await postNow(message, client, database);
                break;
            }
            case 'help': {
                await help(message);
                break;
            }
            case 'website':
            case 'app':
                await sendLink(message);
                break;
            default:
                reply("Hi! I am awake. But I can't execute your command.");
        }
    } catch (err) {
        try {
            await channel.send(`Oops, something went wrong: ${err.message}`);
        } catch (criticalError) {
            console.error(criticalError);
        }
    }
});

client.login(process.env.BOT_TOKEN);
