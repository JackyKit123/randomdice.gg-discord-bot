import * as Discord from 'discord.js';

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
