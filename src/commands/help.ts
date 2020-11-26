import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { Help } from '../helper/cache';

export default async function help(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, author } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('List of Commands')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .setDescription(
            'Here is a list commands, randomdice.gg bot suffix is `.gg`'
        )
        .addFields(
            ((await cache(database, 'discord_bot/help')) as Help[]).map(
                categories => ({
                    name: categories.category,
                    value: categories.commands
                        .map(
                            command =>
                                `\`${command.command}\`\n*${command.description}*`
                        )
                        .join('\n'),
                })
            )
        );

    await author.send(helpMessage);
    if (channel.type === 'text')
        await channel.send(
            '`The list of commands has been sent to your via DM.`'
        );
}
