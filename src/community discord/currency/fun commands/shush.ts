import Discord from 'discord.js';
import commandCost from './commandCost';
import cooldown from '../../../util/cooldown';
import fetchMention from '../../../util/fetchMention';

const shushMember = new Map<string, Discord.MessageCollector | null>();
export default async function shush(message: Discord.Message): Promise<void> {
    const { content, guild, channel, author } = message;

    if (!guild) {
        return;
    }

    if (
        await cooldown(message, '!shush', {
            default: 10 * 60 * 1000,
            donator: 1 * 60 * 1000,
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
    if (!(await commandCost(message, 500))) return;
    if (target.user.bot) {
        await channel.send('You cannot trap a bot');
        return;
    }
    if (shushMember.get(target.id)) {
        await channel.send(
            `${target} has already been trapped inside <:pokeball:820533431217815573>.`
        );
        return;
    }
    await channel.send(
        `Shush ${target}! You are trapped inside a <:pokeball:820533431217815573> for 1 minute.`
    );
    const collector = channel
        .createMessageCollector(
            (collected: Discord.Message) => collected.author.id === target.id,
            { time: 60 * 1000 }
        )
        .on('collect', async (collected: Discord.Message) => {
            const { attachments, member } = collected;
            if (attachments.size) {
                await author.send(
                    `Your last message contains an attachment, it cannot be posted because you are trapped in a <:pokeball:820533431217815573>.`
                );
            }

            if (!content || !member) {
                return;
            }

            try {
                await collected.delete({ reason: 'Fun Command' });
            } catch {
                // do nothing
            }

            let sanitized =
                // eslint-disable-next-line prefer-template
                collected.content.replace(/\|/g, '\\|') +
                '‎'; /* invis unicode */
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
                    allowedMentions: {
                        parse: ['users'],
                    },
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
        })
        .on('end', async () => {
            await channel.send(
                collector.endReason() === 'override'
                    ? `${author}, your <:pokeball:820533431217815573> trap on ${target} has been overriden.`
                    : `${author}, your pokemon ${target} has escaped from <:pokeball:820533431217815573>.`
            );
        });
}

export async function unShush(message: Discord.Message): Promise<void> {
    const { content, guild, channel, author } = message;

    if (!guild || author.id !== '195174308052467712') {
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
    const collector = shushMember.get(target.id);
    if (!collector) {
        await channel.send(`${target} is not shushed.`);
        return;
    }
    shushMember.set(target.id, null);
    collector.stop('override');
    await channel.send(`Untrapped ${target}`);
}
