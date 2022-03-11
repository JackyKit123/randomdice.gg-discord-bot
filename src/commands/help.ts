import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function help(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild } = input;

    if (
        await cooldown(input, '.gg help', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const helpMessage = getBrandingEmbed()
        .setTitle('List of Commands')
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
    const communityHelpMessage = getBrandingEmbed()
        .setTitle('Community Server Specific Commands')
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

    if (guild?.id === process.env.COMMUNITY_SERVER_ID) {
        await reply(
            input,
            {
                content:
                    'Since you are request this `/help` in the community discord. There are two sets of commands for this bot, one is for the generic random dice commands. While the others are a the list of commands specific towards the community discord only.',
                embeds: [helpMessage, communityHelpMessage],
            },
            true
        );
    } else if (guild?.id === process.env.DEV_SERVER_ID) {
        await reply(
            input,
            {
                content:
                    'Since you are request this `/help` in the development discord. There are two sets of commands for this bot, one is for the generic random dice commands. While the others are a the list of commands specific towards the bot developers only.',
                embeds: [helpMessage, devHelpMessage],
            },
            true
        );
    } else {
        await reply(input, { embeds: [helpMessage] }, true);
    }
}

export const commandData: ApplicationCommandData = {
    name: 'help',
    description: 'get the list of commands',
};
