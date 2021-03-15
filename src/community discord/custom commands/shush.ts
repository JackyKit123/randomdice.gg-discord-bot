import * as Discord from 'discord.js';
import cooldown from '../../helper/cooldown';

let shushMember: string | undefined;
export default async function shush(message: Discord.Message): Promise<void> {
    const { content, guild, channel, author } = message;

    if (!guild || author.id !== '285696350702796801') {
        return;
    }

    if (
        await cooldown(message, '!shush', {
            default: 5 * 60 * 1000,
            donator: 5 * 60 * 1000,
        })
    ) {
        return;
    }

    const memberArg = content.split(' ')[1];
    let target: Discord.GuildMember | undefined;
    if (memberArg) {
        const uid =
            memberArg.match(/^<@!?(\d{18})>$/)?.[1] ||
            memberArg.match(/^(\d{18})$/)?.[1];
        target = uid
            ? await guild.members
                  .fetch(uid)
                  .then(u => u)
                  .catch(err => {
                      if (err.message === 'Unknown User') {
                          return undefined;
                      }
                      throw err;
                  })
            : guild.members.cache.find(
                  m =>
                      typeof memberArg === 'string' &&
                      memberArg !== '' &&
                      (m.user.username.toLowerCase() ===
                          memberArg.toLowerCase() ||
                          `${m.user.username}#${m.user.discriminator}`.toLowerCase() ===
                              memberArg.toLowerCase() ||
                          (m.nickname !== null &&
                              content
                                  .split(' ')
                                  .slice(1)
                                  .join(' ')
                                  .toLowerCase()
                                  .startsWith(m.nickname.toLowerCase())))
              );
    }
    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!shush <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }
    if (target.user.bot) {
        await channel.send('You cannot trap a bot');
        return;
    }
    shushMember = target.id;
    await channel.send(
        `Shush ${target}! You are trapped inside <:pokeball:820533431217815573> for 5 minutes.`
    );
    setTimeout(async () => {
        shushMember = undefined;
        await channel.send(
            `${author}, your pokemon ${target} has escaped from <:pokeball:820533431217815573>.`
        );
    }, 1000 * 60 * 5);
}

export async function pokeballTrap(message: Discord.Message): Promise<void> {
    const {
        member,
        deletable,
        channel,
        content,
        attachments,
        author,
    } = message;

    if (!member || member.id !== shushMember) {
        return;
    }

    if (attachments.size) {
        await author.send(
            `Your last message contains an attachment, it cannot be posted because you are trapped in a <:pokeball:820533431217815573>.`
        );
    }

    if (!content) {
        return;
    }

    if (deletable) {
        try {
            await message.delete({ reason: 'Fun Command' });
        } catch {
            // do nothing
        }
    }

    // eslint-disable-next-line prefer-template
    let sanitized = content.replace(/\|/g, '\\|') + '‎'; /* invis unicode */
    while (sanitized.includes('```')) {
        sanitized = sanitized.replace(/```/g, '\\`\\`\\`');
    }
    const displayName =
        // eslint-disable-next-line prefer-template
        member.displayName
            .replace(/\*/g, '\\*')
            .replace(/\|/g, '\\|')
            .replace(/_/g, '\\_')
            .replace(/`/g, '\\`') + '‎'; /* invis unicode */

    const randomString = [
        `**${displayName}** is trapped in a <:pokeball:820533431217815573>: ||${sanitized}||`,
        `**${displayName}** is yelling from inside the <:pokeball:820533431217815573>: ||${sanitized}||`,
        `A sound from a distant <:pokeball:820533431217815573>, **${displayName}** says: ||${sanitized}||`,
        `<:pokeball:820533431217815573>**${displayName}**<:pokeball:820533431217815573>\n||${sanitized}||`,
    ];
    await channel.send(
        randomString[Math.floor(Math.random() * randomString.length)],
        {
            disableMentions: 'everyone',
        }
    );
}
