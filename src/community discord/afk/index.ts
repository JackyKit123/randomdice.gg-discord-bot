import { ApplicationCommandData, GuildMember, MessageEmbed } from 'discord.js';
import parseMsIntoReadableText from 'util/parseMS';

export { default as afk } from './set';
export { default as afkResponse } from './respond';
export { default as afkActivityListener } from './activity';

export const getAfkEmbed = (
    member: GuildMember,
    afkMessage: string,
    timestamp?: number
): MessageEmbed =>
    new MessageEmbed()
        .setAuthor({
            iconURL: member.displayAvatarURL({ dynamic: true }),
            name: `${member.displayName.replace(/^\[AFK\] ?/, '')} is AFK`,
        })
        .setDescription(afkMessage)
        .setColor(member.displayColor)
        .setFooter({ text: `AFK since${!timestamp ? ' • Just Now' : ''}` })
        .setTimestamp(timestamp ?? null)
        .setFields(
            timestamp
                ? [
                      {
                          name: 'Gone for',
                          value: parseMsIntoReadableText(
                              Date.now() - timestamp,
                              true
                          ),
                      },
                  ]
                : []
        );

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
