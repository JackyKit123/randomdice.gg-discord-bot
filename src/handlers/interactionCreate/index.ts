import { Interaction } from 'discord.js';
import drawDice from 'community discord/currency/drawDice';
import logMessage from 'dev-commands/logMessage';
import { baseCommands } from 'register/commandCase';

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
            await baseCommands(interaction, interaction.commandName);
        }
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when executing interaction in ${
                guild ? `server ${guild.name}` : `DM with <@${user.id}>`
            } : ${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
