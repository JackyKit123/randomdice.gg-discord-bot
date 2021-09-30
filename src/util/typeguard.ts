import Discord from 'discord.js';

// eslint-disable-next-line import/prefer-default-export
export function isGuild(
    channel: Discord.Channel | Discord.PartialDMChannel
): channel is Discord.TextChannel | Discord.NewsChannel {
    return channel.type === 'text' || channel.type === 'news';
}
