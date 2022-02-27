import Discord from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';

export default async function help(
    message: Discord.Message,
    communityHelpOnly?: true
): Promise<void> {
    const { channel, author, guild } = message;

    if (
        await cooldown(message, '.gg help', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const helpMessage = new Discord.MessageEmbed()
        .setTitle('List of Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setDescription(
            'Here is a list of commands, randomdice.gg bot suffix is `.gg`'
        )
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
    const communityHelpMessage = new Discord.MessageEmbed()
        .setTitle('Community Server Specific Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setDescription(
            'Here is a list of commands, random dice community discord specific commands suffix is `!`'
        )
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

    if (communityHelpOnly) {
        await author.send({ embeds: [communityHelpMessage] });
    } else {
        await author.send({ embeds: [helpMessage] });
        if (guild?.id === '804222694488932362') {
            await author.send({
                content:
                    'It looks like you are requesting the help message from the community discord. Here is the list of fun commands specific towards the community discord only.',
                embeds: [communityHelpMessage],
            });
        }
    }
    if (channel.type !== 'DM')
        await channel.send(
            'The list of commands has been sent to your via DM.'
        );
}
