import { Interaction } from 'discord.js';
import drawDice from 'community discord/currency/drawDice';
import logMessage from 'dev-commands/logMessage';
import ping from 'commands/ping';

export default async function interactionCreate(
    interaction: Interaction
): Promise<void> {
    const { guildId, user, channelId, guild, client } = interaction;

    if (
        // ignoring other servers in development, ignoring dev channel in production
        (process.env.DEV_SERVER_ID &&
            process.env.NODE_ENV === 'development' &&
            guildId !== process.env.DEV_SERVER_ID &&
            channelId !== '804640084007321600') ||
        (process.env.NODE_ENV === 'production' &&
            guildId === process.env.DEV_SERVER_ID)
    ) {
        return;
    }

    try {
        if (interaction.isMessageComponent()) {
            switch (interaction.customId) {
                case 'dd':
                    await drawDice(interaction);
                    break;
                default:
                    break;
            }
        }
        if (interaction.isCommand()) {
            switch (interaction.commandName) {
                case 'ping':
                    await ping(interaction);
                    break;
                default:
            }
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\nwhen executing interaction`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
}
