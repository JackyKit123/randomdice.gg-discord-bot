import { GuildMember, TextBasedChannel, User } from 'discord.js';

export default function getMessageLink(
    input: TextBasedChannel | GuildMember | User,
    messageId = ''
): string {
    return `https://discordapp.com${
        input instanceof User ||
        input instanceof GuildMember ||
        input.type === 'DM'
            ? '/users'
            : `/channels/${input.guild.id}`
    }/${input.id}/${messageId}`;
}
