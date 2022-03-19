import channelIds from 'config/channelIds';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import cooldown from 'util/cooldown';
import commandCost from './commandCost';

export default async function imitate(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, channel, guild, commandName, user } = interaction;

    const text = options.getString('content', true);

    const webhooks = await guild.fetchWebhooks();
    const webhook = webhooks.find(wh => wh.name.toLowerCase() === commandName);

    if (
        await cooldown(interaction, {
            default: 20 * 1000,
            donator: 2 * 1000,
        })
    )
        return;

    if (!webhook) {
        await interaction.reply(`Error, your idol not found.`);
        return;
    }

    if (!(await commandCost(interaction, 100))) return;

    if (channel && webhook.channelId !== channel?.id) {
        await webhook.edit({
            channel: channel.id,
        });
    }
    const logChannel = guild.channels.cache.get(channelIds['message-log']);

    await interaction.reply({
        content: `I have sent your message as your favorite idol.`,
        ephemeral: true,
    });

    if (logChannel?.isText()) {
        await logChannel.send(`${user} used /${commandName}\n> ${text}`);
    }

    await webhook.send({
        content: text,
        allowedMentions: {
            parse: ['users'],
        },
    });
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'yomama',
        description: 'Sends a message as YoMama',
        options: [
            {
                name: 'content',
                type: 'STRING',
                description: 'The content of the message',
                required: true,
            },
        ],
    },
    {
        name: 'moongirl',
        description: 'Sends a message as a MoonGirl',
        options: [
            {
                name: 'content',
                type: 'STRING',
                description: 'The content of the message',
                required: true,
            },
        ],
    },
];
