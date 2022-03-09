import channelIds from 'config/channelIds';
import Discord from 'discord.js';

const isBotChannels = (
    channel: Discord.Channel | Discord.PartialDMChannel
): boolean =>
    (!channel.partial &&
        channel.isText() &&
        !channel.isThread() &&
        channel.type !== 'DM' &&
        (channel.parentId === channelIds['🤖 | Bot Channels'] ||
            channel.parentId === channelIds['💫 | VIP Channels'])) ||
    channel.id === channelIds['jackykit-playground-v2'] ||
    channel.id === channelIds['jackykit-playground-v3'];
export default isBotChannels;
