import Discord from 'discord.js';

export default async function fetchMentionString(
    str: string,
    guild: Discord.Guild,
    matchNickName?: {
        content: string;
        mentionIndex: number;
    }
): Promise<Discord.GuildMember | undefined> {
    if (!str) {
        return undefined;
    }
    const uid =
        str.match(/^<@!?(\d{18})>$/)?.[1] || str.match(/^(\d{18})$/)?.[1];
    return uid
        ? guild.members
              .fetch(uid)
              .then(u => u)
              .catch(err => {
                  if (
                      err.message === 'Unknown User' ||
                      err.message === 'Unknown Member'
                  ) {
                      return undefined;
                  }
                  throw err;
              })
        : guild.members.cache.find(
              m =>
                  m.user.username.toLowerCase() === str.toLowerCase() ||
                  `${m.user.username}#${m.user.discriminator}`.toLowerCase() ===
                      str.toLowerCase() ||
                  (m.nickname !== null &&
                      typeof matchNickName !== 'undefined' &&
                      matchNickName.content
                          .split(' ')
                          .slice(matchNickName.mentionIndex)
                          .join(' ')
                          .toLowerCase() === m.nickname.toLowerCase())
          );
}

export function emojiToText(input: string): string {
    const matchDiscordEmojiRegex = /<a?:([^\W<>:]+):\d{18}>/;
    return input.replace(
        new RegExp(matchDiscordEmojiRegex, 'g'),
        str => str.match(matchDiscordEmojiRegex)?.[1] || ''
    );
}

export function userMentionToText(
    input: string,
    instance: Discord.Client | Discord.Guild
): string {
    const matchUserMentionRegex = /<@!?(\d{18})>/;
    return input.replace(new RegExp(matchUserMentionRegex, 'g'), str => {
        try {
            const userId = str.match(matchUserMentionRegex)?.[1];
            if (!userId) return '';
            if (instance instanceof Discord.Guild) {
                const member = instance.members.cache.get(userId);
                return member?.displayName || '';
            }
            return instance.users.cache.get(userId)?.username || '';
        } catch {
            return '';
        }
    });
}
export function roleMentionToText(input: string, guild: Discord.Guild): string {
    const matchRoleMentionRegex = /<@&(\d{18})>/;
    return input.replace(
        new RegExp(matchRoleMentionRegex, 'g'),
        str =>
            guild.roles.cache.get(str.match(matchRoleMentionRegex)?.[1] || '')
                ?.name || ''
    );
}

export function channelMentionToText(
    input: string,
    guild: Discord.Guild
): string {
    const matchChannelMentionRegex = /<#(\d{18})>/;
    return input
        .replace(
            new RegExp(matchChannelMentionRegex, 'g'),
            str =>
                guild.channels.cache.get(
                    str.match(matchChannelMentionRegex)?.[1] || ''
                )?.name || ''
        )
        .replace('-', ' ');
}

export function replaceAllMentionToText(
    input: string,
    instance: Discord.Client | Discord.Guild
): string {
    let output = input;
    output = emojiToText(output);
    output = userMentionToText(output, instance);
    if (instance instanceof Discord.Guild) {
        output = roleMentionToText(output, instance);
        output = channelMentionToText(output, instance);
    }
    return output;
}
