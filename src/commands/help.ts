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

    if (isCommunityDiscord(guild)) {
        await interaction.reply({
            content:
                'Since you are request this `/help` in the community discord. There are two sets of commands for this bot, one is for the generic random dice commands. While the others are a the list of commands specific towards the community discord only.',
            embeds: [helpMessage, communityHelpMessage],
            ephemeral: true,
        });
    } else if (isDevTestDiscord(guild)) {
        await interaction.reply({
            content:
                'Since you are request this `/help` in the development discord. There are two sets of commands for this bot, one is for the generic random dice commands. While the others are a the list of commands specific towards the bot developers only.',
            embeds: [helpMessage, devHelpMessage],
            ephemeral: true,
        });
    } else {
        await interaction.reply({ embeds: [helpMessage], ephemeral: true });
    }
}

export const commandData: ApplicationCommandData = {
    name: 'help',
    description: 'get the list of commands',
};
