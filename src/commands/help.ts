import { isCommunityDiscord, isDevTestDiscord } from 'config/guild';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function help(
    interaction: CommandInteraction
): Promise<void> {
    const { guild } = interaction;

    if (
        await cooldown(interaction, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const helpMessage = getBrandingEmbed()
        .setTitle('List of Commands')
        .setDescription('Here is a list of commands')
        .addFields(
            cache['discord_bot/help'].map(categories => ({
                name: categories.category,
                value: categories.commands
                    .map(
                        command =>
                            `\`${command.command}\`\n*${command.description}*`
                    )
                    .join('\n'),
            }))
        )
        .addField(
            'Privacy Information',
            'When you are using this bot, you are subjected to have your message content logged only in the mod log channel the Community Discord solely for moderation purposes.\nIf you do not wish to be logged, you may remove the READ_MESSAGE permission from the bot. The bot functions normally under application commands (slash commands).\nIf you are using this bot in a private message, you are not subject to this logging.'
        );
    const communityHelpMessage = getBrandingEmbed()
        .setTitle('Community Server Specific Commands')
        .setDescription('Here is a list of commands for community discord only')
        .addFields(
            cache['discord_bot/community/help'].map(categories => ({
                name: categories.category,
                value: categories.commands
                    .map(
                        command =>
                            `\`${command.command}\`\n*${command.description}*`
                    )
                    .join('\n'),
            }))
        )
        .addField(
            'Privacy Information',
            'Since you are using this bot in the Community Discord, you are subjected to have your message content logged as mentioned above, and members of the Community Discord cannot opt-out of this logging, you may choose to leave this server if you have privacy concern.'
        );
    const devHelpMessage = getBrandingEmbed()
        .setTitle('Developer Commands')
        .setDescription('Here is a list commands for the bot developer.')
        .addFields(
            cache['discord_bot/dev_help'].map(categories => ({
                name: categories.category,
                value: categories.commands
                    .map(
                        command =>
                            `\`${command.command}\`\n*${command.description}*`
                    )
                    .join('\n'),
            }))
        );

    await interaction.reply({
        embeds: [helpMessage],
        ephemeral: true,
    });
    if (isCommunityDiscord(guild)) {
        await interaction.followUp({
            content:
                'Since you are request this `/help` in the community discord. Here is a the list of commands specific towards the community discord only.',
            embeds: [communityHelpMessage],
            ephemeral: true,
        });
    } else if (isDevTestDiscord(guild)) {
        await interaction.followUp({
            content:
                'Since you are request this `/help` in the development discord. Here is a the list of commands specific towards the bot developers only.',
            embeds: [helpMessage, devHelpMessage],
            ephemeral: true,
        });
    }
}

export const commandData: ApplicationCommandData = {
    name: 'help',
    description: 'get the list of commands',
};
