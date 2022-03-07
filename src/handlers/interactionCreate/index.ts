import { Interaction } from 'discord.js';
import drawDice from 'community discord/currency/drawDice';
import logMessage from 'dev-commands/logMessage';
import { baseCommands, communityServerCommands } from 'register/commandCase';
import { closeApplication } from 'community discord/apply';
import { report } from 'community discord/report';

export default async function interactionCreate(
    interaction: Interaction
): Promise<void> {
    const { user, guild, client, channel } = interaction;

    if (
        (process.env.NODE_ENV === 'development' &&
            guild &&
            guild.id !== process.env.DEV_SERVER_ID &&
            channel?.id !== '804640084007321600') ||
        (process.env.NODE_ENV === 'production' &&
            (guild?.id === process.env.DEV_SERVER_ID ||
                channel?.id === '804640084007321600'))
    )
        return;

    try {
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'dd':
                    await drawDice(interaction);
                    break;
                case 'application-submit':
                case 'application-cancel':
                    await closeApplication(interaction);
                    break;
                default:
            }
        }
        if (interaction.isCommand()) {
            await Promise.all([
                baseCommands(interaction, interaction.commandName),
                communityServerCommands(interaction, interaction.commandName),
            ]);
        }
        if (interaction.isContextMenu()) {
            switch (interaction.commandName) {
                case 'Report this message':
                    await report(interaction);
                    break;
                default:
            }
        }
    } catch (err) {
        try {
            if (
                interaction.isButton() ||
                interaction.isCommand() ||
                interaction.isContextMenu()
            ) {
                await interaction.reply(
                    `Oops, something went wrong:\n${
                        (err as Error).message ?? err
                    }`
                );
            }
        } finally {
            await logMessage(
                client,
                'warning',
                `Oops, something went wrong when executing interaction in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${(err as Error).stack ?? (err as Error).message ?? err}`
            );
        }
    }
}
