import Discord from 'discord.js';

const isBotChannels = (
    channel: Discord.Channel | Discord.PartialDMChannel
): boolean =>
    !channel.partial &&
    channel.isText() &&
    !channel.isThread() &&
    channel.type !== 'DM' &&
    (channel.parentId === '804227071765118976' ||
        channel.parentId === '805739701902114826');
export default isBotChannels;
