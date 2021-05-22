import * as Discord from 'discord.js';
import cooldown from '../../helper/cooldown';
import fetchMention from '../../helper/fetchMention';

let shushMember: string | undefined;
export default async function shush(message: Discord.Message): Promise<void> {
    const { content, guild, channel, author, member } = message;

    if (!guild) {
        return;
    }

    if (author.id !== '285696350702796801') {
        const commandOwner = guild.member('285696350702796801');
        const memberStr = commandOwner
            ? `**${commandOwner.user.username}#${commandOwner.user.discriminator}**`
            : '<@285696350702796801>';
        await channel.send(
            `This is a private command dedicated to ${memberStr} as a perk of $50 Patreon Donator.`
        );
        return;
    }

    if (!member?.roles.cache.has('805727466219372546')) {
        await channel.send(
            'You are no longer $50 Patreon and you can no longer use this command.'
        );
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
    const target = await fetchMention(memberArg, guild, {
        content,
        mentionIndex: 1,
    });
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
        guild,
    } = message;

    if (!guild || !member || member.id !== shushMember) {
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
    Array.from(content.matchAll(/<@&(\d{18})>/g) ?? []).forEach(
        ([, roleId]) => {
            const role = guild.roles.cache.get(roleId);
            if (!role || role.mentionable) {
                return;
            }

            if (
                !role.mentionable &&
                !(channel as Discord.GuildChannel)
                    .permissionsFor(member)
                    ?.has('MENTION_EVERYONE')
            ) {
                sanitized = sanitized.replace(
                    new RegExp(`<@&${role.id}>`, 'g'),
                    `@${role.name}`
                );
            }
        }
    );
    while (sanitized.includes('```')) {
        sanitized = sanitized.replace(/`{3,}/g, match =>
            match.replace(/`/g, '\\`')
        );
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

    if (
        /^!(?:poll|echo|aesthetics|ae|boldfancy|bf|boldfraktur|clap|double|ds|emojify|fancy|ff|fraktur|owofy|smallcaps|sc|space)\b/.test(
            content
        )
    ) {
        try {
            await channel.messages.cache
                .last(2)
                .find(
                    m =>
                        m.author.id === '235148962103951360' &&
                        !m.embeds.length &&
                        !m.attachments.size
                )
                ?.delete();
            channel
                .createMessageCollector(
                    m =>
                        m.author.id === '235148962103951360' &&
                        !m.embeds.length &&
                        !m.attachments.size,
                    { max: 1, time: 3 * 1000 }
                )
                .on('collect', m => m.delete());
        } catch {
            //
        }
    }
}
