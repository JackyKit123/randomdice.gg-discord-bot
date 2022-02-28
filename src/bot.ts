import { Client } from 'discord.js';
import initFirebase from 'register/firebase';
import logMessage from 'dev-commands/logMessage';
import reboot from 'dev-commands/reboot';
import botEventHandlers from 'handlers';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Client({
    partials: ['MESSAGE', 'GUILD_MEMBER'],
    intents: [
        'GUILDS',
        'GUILD_BANS',
        'GUILD_EMOJIS_AND_STICKERS',
        'GUILD_INTEGRATIONS',
        'GUILD_WEBHOOKS',
        'GUILD_INVITES',
        'GUILD_VOICE_STATES',
        'GUILD_MEMBERS',
        'GUILD_MESSAGES',
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MESSAGE_TYPING',
        'DIRECT_MESSAGES',
        'DIRECT_MESSAGE_REACTIONS',
        'DIRECT_MESSAGE_TYPING',
    ],
});

initFirebase();

botEventHandlers(client);

client.login(process.env.BOT_TOKEN);

process.on('uncaughtException', async error => {
    try {
        await logMessage(
            client,
            `${process.env.DEV_USERS_ID?.split(',').map(
                uid => `<@${uid}>`
            )}\n**__Critical Error__**\n**Unhandled Exception**\n${error.stack}`
        );
    } catch (networkError) {
        // eslint-disable-next-line no-console
        console.error(networkError);
    } finally {
        try {
            await logMessage(
                client,
                'Self rebooting due to unhandled exception.'
            );
            client.destroy();
            await reboot();
        } catch {
            process.exit();
        }
    }
});

process.on('exit', () => client.destroy());
