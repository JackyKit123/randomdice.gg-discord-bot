import * as Discord from 'discord.js';
import cache from '../util/cache';

export default async function help(message: Discord.Message): Promise<void> {
    const { author } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('Developer Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
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

    await author.send(helpMessage);
}
