import Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import fetchMention from 'util/fetchMention';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function clown(message: Discord.Message): Promise<void> {
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
    let clownedABot = false;
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
    } else if (
        member.id === '195174308052467712' ||
        (['722951439567290458', '415166565550653442'].includes(target.id) &&
            Math.random() < 0.95)
    ) {
        await sentMessage.edit(
            `${target} got clowned by ${author}.<a:clowndance:845532985787940894>`
        );
    } else if (target.roles.cache.has('845530033695096853')) {
        await sentMessage.edit(
            `${target} has already been clowned. Why are you so desperate? I guess you are the real clown then.`
        );
        target = member;
    } else if (target.user.bot) {
        await sentMessage.edit(
            `What's wrong in your mind to clown a bot? Good Try tho, you clown.`
        );
        clownedABot = true;
        target = member;
    } else if (
        target.id === '195174308052467712' ||
        (['722951439567290458', '415166565550653442'].includes(target.id) &&
            Math.random() < 0.95) ||
        (target.id !== member.id && Math.random() < 0.6)
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
        typedWrongCommand || clownedABot || member.id === '195174308052467712'
            ? 10
            : Math.ceil(Math.random() * 10);
    try {
        await target.roles.add('845530033695096853');
        await target.setNickname('🤡'.repeat(howClown));
    } catch (err) {
        // suppress error
    } finally {
        await channel.send({
            content:
                typedWrongCommand || clownedABot
                    ? `${target} ${clownedABot ? 'tried to clown a bot.' : ''}${
                          typedWrongCommand ? 'typed the wrong command.' : ''
                      } 100% clown!<a:clowndance:845532985787940894>`
                    : `${target} is a ${
                          howClown * 10
                      }% clown.<a:clowndance:845532985787940894>`,
            allowedMentions: {
                users: [],
                roles: [],
                parse: [],
            },
        });
        await wait(1000 * 60 * 5);
        try {
            if (target.roles.cache.has('845530033695096853')) {
                await target.roles.remove('845530033695096853');
            }
            await wait(5000);
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
    if (!client.user) return;
    const logs = await guild.fetchAuditLogs({
        user: client.user,
    });
    logs.entries.forEach(async entry => {
        if (Date.now() - entry.createdTimestamp <= 1000 * 60 * 10) {
            const memberNicknameUpdated: string[] = [];
            if (!(entry.target instanceof Discord.User)) return;
            try {
                const member = await guild.members.fetch({
                    user: entry.target,
                });
                if (
                    entry.action === 'MEMBER_ROLE_UPDATE' &&
                    member.roles.cache.has('845530033695096853')
                ) {
                    await member.roles.remove('845530033695096853');
                } else if (entry.action === 'MEMBER_UPDATE') {
                    entry.changes?.forEach(async change => {
                        if (change.key === 'nick') {
                            if (
                                typeof change.new === 'string' &&
                                /^\u{1F921}{1,10}$/u.test(change.new)
                            ) {
                                if (
                                    typeof change.old === 'string' &&
                                    /^\u{1F921}{1,10}$/u.test(change.old) &&
                                    memberNicknameUpdated.includes(member.id)
                                ) {
                                    return;
                                }
                                await member.setNickname(
                                    typeof change.old === 'string'
                                        ? change.old
                                        : null
                                );
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
