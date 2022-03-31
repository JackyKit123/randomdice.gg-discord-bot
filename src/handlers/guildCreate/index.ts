import { isProd } from 'config/env';
import logBotInvite from 'dev-commands/logBotInvite';
import { Guild } from 'discord.js';
import { logError } from 'util/logMessage';

export default async function guildCreate(guild: Guild): Promise<void> {
    const { client } = guild;
    try {
        if (isProd) {
            await logBotInvite(guild);
        }
    } catch (error) {
        await logError(client, error, 'client#guildCreate', guild);
    }
}
