import Discord from 'discord.js';
import commandCost from './commandCost';

export default async function yomama(message: Discord.Message): Promise<void> {
    const { content, channel, attachments, guild, author, member } = message;

    const text = content.replace(/^!yomama ?/i, '');

    if (!guild || !member) return;

    const webhooks = await guild.fetchWebhooks();
    const webhook = webhooks.find(wh => wh.name.toLowerCase() === 'yomama');

    if (!webhook) {
        await channel.send(`Error, YoMama not found.`);
        return;
    }

    if (!text) {
        await channel.send('You need to include the text, `!yomama <text>`');
        return;
    }

    if (!(await commandCost(message, 100))) return;

    try {
        await message.delete();
    } catch {
        // do nothing
    }

    if (webhook.channelId !== channel.id) {
        await webhook.edit({
            channel: channel.id,
        });
    }

    await webhook.send({
        content: text,
        allowedMentions: {
            parse: ['users'],
        },
    });

    if (attachments.size) {
        try {
            await author.send(
                'Your message contains attachment(s) but cannot be sent using this command.'
            );
        } catch {
            // do nothing
        }
    }
}
