import * as Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from '../../../helper/cooldown';
import fetchMention from '../../../helper/fetchMention';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function clown(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { content, author, guild, channel, member } = message;

    if (!guild || !member) {
        return;
    }

    if (
        await cooldown(message, '!clown', {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 1,
        })
    ) {
        return;
    }
    if (
        !(await commandCost(message, Math.round(Math.random() * 3500 - 1500)))
    ) {
        await channel.send(
            "Usually that's the case, but today I am gonna allow you to use it.<a:clowndance:845532985787940894>"
        );
    }
    const memberArg = content.split(' ')?.[1];

    let target = await fetchMention(memberArg, guild, {
        content,
        mentionIndex: 1,
    });
    if (!target && member.id === '195174308052467712') {
        await channel.send('Unknown target.');
        return;
    }
    if (
        target?.id === author.id &&
        member.roles.cache.has('845530033695096853')
    ) {
        await channel.send('Slow Down. You are already a clown, jeez.');
        return;
    }
    const sentMessage = await channel.send(
        'https://media.tenor.com/images/87126cc81f03e22938d296cc5a60b2d2/tenor.gif'
    );
    await wait(4700);
    let typedWrongCommand = false;
    if (!target) {
        await sentMessage.edit(
            `You are so stupid that you can't even type the command right, I guess you are the real clown then.\nUsage of the command: \`\`\`!clown <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        target = member;
        typedWrongCommand = true;
    } else if (target.id === author.id) {
        await sentMessage.edit(
            `${author}, you have a weird interest, but yes you can be a clown yourself, now entertain us.`
        );
    } else if (member.id === '195174308052467712') {
        await sentMessage.edit(
            `${target} got clowned by ${author}.<a:clowndance:845532985787940894>`
        );
    } else if (target.roles.cache.has('845530033695096853')) {
        await sentMessage.edit(
            `${target} has already been clowned. Why are you so desperate? I guess you are the real clown then.`
        );
        target = member;
    } else if (
        (target.id !== member.id && Math.random() < 0.7) ||
        (member.id === '722951439567290458' && Math.random() < 0.95) ||
        (target.id === '195174308052467712' && Math.random() > 0.95)
    ) {
        await sentMessage.edit(
            `${author} is trying clown ${target}. **BUT IT BACKFIRED, ${author} is now a clown LOL!!!**`
        );
        target = member;
    } else {
        await sentMessage.edit(
            `${target} got clowned by ${author}.<a:clowndance:845532985787940894>`
        );
    }
    const originalName = target.displayName;
    const howClown =
        typedWrongCommand || member.id === '195174308052467712'
            ? 10
            : Math.ceil(Math.random() * 10);
    try {
        await target.roles.add('845530033695096853');
        await target.setNickname('🤡'.repeat(howClown));
    } catch (err) {
        // suppress error
    } finally {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('🤡')
                .setDescription(
                    typedWrongCommand
                        ? `${target} typed the wrong command. 100% clown!<a:clowndance:845532985787940894>`
                        : `${target} is a ${
                              howClown * 10
                          }% clown.<a:clowndance:845532985787940894>`
                )
        );
        await wait(1000 * 60 * 5);
        try {
            if (target.roles.cache.has('845530033695096853')) {
                await target.roles.remove('845530033695096853');
            }
            await target.setNickname(originalName);
        } catch (err) {
            // suppress error
        }
    }
}

export async function purgeRolesOnReboot(
    client: Discord.Client
): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    const logs = await guild.fetchAuditLogs({
        user: client.user as Discord.ClientUser,
    });
    logs.entries.forEach(async entry => {
        if (Date.now() - entry.createdTimestamp <= 1000 * 60 * 10) {
            const memberNicknameUpdated: string[] = [];
            try {
                const member = await guild.members.fetch({
                    user: entry.target as Discord.User,
                });
                if (
                    entry.action === 'MEMBER_ROLE_UPDATE' &&
                    member.roles.cache.has('845530033695096853')
                ) {
                    await member.roles.remove('845530033695096853');
                } else if (entry.action === 'MEMBER_UPDATE') {
                    entry.changes?.forEach(async change => {
                        if (change.key === 'nick') {
                            if (change.new?.match(/^\u{1F921}{1,10}$/u)) {
                                if (
                                    change.old &&
                                    change.old.match(/^\u{1F921}{1,10}$/u) &&
                                    memberNicknameUpdated.includes(member.id)
                                ) {
                                    return;
                                }
                                await member.setNickname(change.old || '');
                                memberNicknameUpdated.push(member.id);
                            }
                        }
                    });
                }
            } catch (err) {
                // nothing
            }
        }
    });
}
