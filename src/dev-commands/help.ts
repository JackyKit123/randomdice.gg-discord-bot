import getBrandingEmbed from 'commands/util/getBrandingEmbed';
import Discord from 'discord.js';
import cache from 'util/cache';

export default async function help(message: Discord.Message): Promise<void> {
    const { author } = message;

    const helpMessage = getBrandingEmbed()
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

    await author.send({ embeds: [helpMessage] });
}
