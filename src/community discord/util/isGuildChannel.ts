import {
    Guild,
    GuildChannel,
    GuildTextBasedChannel,
    TextBasedChannel,
} from 'discord.js';

export default (
    channel: TextBasedChannel | null
): channel is GuildTextBasedChannel =>
    (channel as GuildChannel).guild instanceof Guild;
