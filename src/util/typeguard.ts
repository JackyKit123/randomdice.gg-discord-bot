import Discord from 'discord.js';

export function isGuild(
    channel: Discord.Channel | Discord.PartialDMChannel
): channel is Discord.TextChannel | Discord.NewsChannel {
    return channel.type === 'text' || channel.type === 'news';
}
