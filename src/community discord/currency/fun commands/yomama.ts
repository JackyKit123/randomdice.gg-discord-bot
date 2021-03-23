import * as Discord from 'discord.js';
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

    let sanitized = text;
    if (
        !(channel as Discord.GuildChannel)
            .permissionsFor(member)
            ?.has('MENTION_EVERYONE')
    ) {
        sanitized = sanitized
            .replace(/@everyone/g, '@‎everyone')
            .replace(/@here/g, '@‎here');
        Array.from(text.matchAll(/<@&(\d{18})>/g) ?? []).forEach(
            ([, roleId]) => {
                const role = guild.roles.cache.get(roleId);
                if (!role || role.mentionable) {
                    return;
                }

                sanitized = sanitized.replace(
                    new RegExp(`<@‎&${role.id}>`, 'g'),
                    `@${role.name}`
                );
            }
        );
    }

    if (!(await commandCost(message, 100))) return;

    try {
        await message.delete();
    } catch {
        // do nothing
    }

    if (webhook.channelID !== channel.id) {
        await webhook.edit({
            channel: channel.id,
        });
    }

    await webhook.send(sanitized);

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
