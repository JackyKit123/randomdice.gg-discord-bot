import { pokeball } from 'config/emojiId';
import Discord from 'discord.js';
import cooldown from 'util/cooldown';
import fetchMention from 'util/fetchMention';
import commandCost from './commandCost';

let shushMember: { by: Discord.User; victim: string }[] = [];
export default async function shush(message: Discord.Message): Promise<void> {
    const { content, guild, member, channel, author } = message;

    if (!guild || !member) return;

    const memberArg = content.split(' ')[1];
    let target = await fetchMention(memberArg, guild, {
        content,
        mentionIndex: 1,
    });
    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!shush <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }
    if (target.id === '195174308052467712') {
        target = member;
    }
    if (
        await cooldown(message, '!shush', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (!(await commandCost(message, 100))) return;
    if (target.user.bot) {
        await channel.send('You cannot trap a bot');
        return;
    }
    if (shushMember.some(m => m.victim === target?.id)) {
        await channel.send({
            content: `${target} has already been trapped inside ${pokeball}.`,
            allowedMentions: {
                parse: [],
                users: [],
            },
        });
        return;
    }
    shushMember = [...shushMember, { victim: target.id, by: author }];
    await channel.send({
        content: `Shush ${target}! You are trapped inside a ${pokeball} for 10 seconds.`,
        allowedMentions: {
            parse: [],
            users: [],
        },
    });
    setTimeout(async () => {
        if (!target || !shushMember.some(m => m.victim === target?.id)) return;
        shushMember = shushMember.filter(m => m.victim !== target?.id);
        await channel.send({
            content: `${author}, your pokemon ${target} has escaped from ${pokeball}.`,
            allowedMentions: {
                parse: [],
                users: [],
            },
        });
    }, 1000 * 10);
}

export async function unShush(message: Discord.Message): Promise<void> {
    const { content, guild, channel, member } = message;

    if (
        !guild ||
        !member ||
        !(channel as Discord.GuildTextBasedChannel)
            .permissionsFor(member)
            .has('MANAGE_MESSAGES')
    ) {
        await channel.send('You tried.');
        return;
    }

    const memberArg = content.split(' ')[1];
    const target = await fetchMention(memberArg, guild, {
        content,
        mentionIndex: 1,
    });
    if (!target) {
        await channel.send(`Unknown Target`);
        return;
    }
    const shushed = shushMember.find(m => m.victim === target?.id);
    if (!shushed) {
        await channel.send(`${target} is not shushed.`);
        return;
    }
    shushMember = shushMember.filter(m => m.victim !== shushed.victim);
    await channel.send({
        content: `${shushed.by}, your pokemon <@${shushed.victim}> has been released from ${pokeball}. by ${member}`,
        allowedMentions: {
            parse: [],
            users: [],
        },
    });
}

export async function pokeballTrap(message: Discord.Message): Promise<void> {
    const { member, deletable, channel, content, attachments, author, guild } =
        message;

    if (!guild || !member || !shushMember.some(m => m.victim === member.id)) {
        return;
    }

    if (attachments.size) {
        await author.send(
            `Your last message contains an attachment, it cannot be posted because you are trapped in a ${pokeball}.`
        );
    }

    if (!content) {
        return;
    }

    if (deletable) {
        try {
            await message.delete();
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
                channel instanceof Discord.GuildChannel &&
                !channel.permissionsFor(member)?.has('MENTION_EVERYONE')
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
        `**${displayName}** is trapped in a ${pokeball}: ||${sanitized}||`,
        `**${displayName}** is yelling from inside the ${pokeball}: ||${sanitized}||`,
        `A sound from a distant ${pokeball}, **${displayName}** says: ||${sanitized}||`,
        `${pokeball}**${displayName}**${pokeball}\n||${sanitized}||`,
    ];
    await channel.send({
        content: randomString[Math.floor(Math.random() * randomString.length)],
        allowedMentions: {
            parse: ['users'],
        },
    });

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
                .createMessageCollector({
                    filter: m =>
                        m.author.id === '235148962103951360' &&
                        !m.embeds.length &&
                        !m.attachments.size,
                    max: 1,
                    time: 3 * 1000,
                })
                .on('collect', async m => {
                    await m.delete();
                });
        } catch {
            //
        }
    }
}
