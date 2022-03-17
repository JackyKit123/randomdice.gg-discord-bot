import { TextBasedChannel } from 'discord.js';

export default function getMessageLink(
    messageId: string,
    channel: TextBasedChannel
): string {
    return `https://discordapp.com/channels/${
        channel.type === 'DM' ? '@me' : channel.guild.id
    }/${channel.id}/${messageId}`;
}
