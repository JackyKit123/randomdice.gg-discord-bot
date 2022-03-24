import { ApplicationCommandData, GuildMember, MessageEmbed } from 'discord.js';
import parseMsIntoReadableText from 'util/parseMS';

export { default as afk } from './set';
export { default as afkResponse } from './respond';
export { default as afkActivityListener } from './activity';

export const getAfkEmbed = (
    member: GuildMember,
    timestamp: number,
    afkMessage: string
): MessageEmbed =>
    new MessageEmbed()
        .setTitle(`${member.displayName} is AFK`)
        .setDescription(afkMessage)
        .setColor(member.displayColor)
        .addField(
            'Gone for',
            parseMsIntoReadableText(Date.now() - timestamp, true)
        )
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'AFK since' })
        .setTimestamp(timestamp);

export const commandData: ApplicationCommandData = {
    name: 'afk',
    description: 'Set your afk status',
    options: [
        {
            name: 'message',
            description: 'The message to display when you are afk',
            type: 'STRING',
        },
    ],
};
