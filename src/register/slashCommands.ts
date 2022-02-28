import { ApplicationCommandDataResolvable, Client } from 'discord.js';

export default async function registerSlashCommands(
    client: Client
): Promise<void> {
    const commands: ApplicationCommandDataResolvable[] = [
        {
            name: 'ping',
            description: 'ping the bot to see if it is online',
        },
        {
            name: 'dice',
            description: 'get the information about a die',
            options: [
                {
                    type: 3,
                    name: 'die',
                    description: 'the name of the die',
                    required: true,
                },
                {
                    type: 4,
                    name: 'class',
                    description: 'the class of the die',
                },
                {
                    type: 4,
                    name: 'level',
                    description: 'the level of the die',
                },
            ],
        },
    ];

    if (process.env.NODE_ENV === 'development') {
        await client.guilds.cache
            .get(process.env.DEV_SERVER_ID ?? '')
            ?.commands.set(commands);
    } else if (process.env.NODE_ENV === 'production') {
        await Promise.all([
            client.guilds.cache
                .get(process.env.COMMUNITY_SERVER_ID ?? '')
                ?.commands.set(commands),
            client.guilds.cache
                .get(process.env.COMMUNITY_APPEAL_SERVER_ID ?? '')
                ?.commands.set(commands),
            client.application?.commands.set(commands),
        ]);
    }
}
