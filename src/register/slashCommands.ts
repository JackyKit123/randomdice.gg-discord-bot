import { Client } from 'discord.js';

export default async function registerSlashCommands(
    client: Client
): Promise<void> {
    const commands = [
        {
            name: 'ping',
            description: 'ping the bot to see if it is online',
        },
    ];

    await (process.env.NODE_ENV === 'development'
        ? client.guilds.cache
              .get(process.env.DEV_SERVER_ID ?? '')
              ?.commands.set(commands)
        : client.application?.commands.set(commands));
}
