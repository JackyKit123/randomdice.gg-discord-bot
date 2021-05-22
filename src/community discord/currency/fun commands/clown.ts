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
            donator: 60 * 1000 * 5,
        })
    ) {
        return;
    }
    if (
        !(await commandCost(message, Math.round(Math.random() * 2000 - 1000)))
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
    let typedWrongCommand = false;
    if (member.id === '195174308052467712') {
        if (!target) {
            await channel.send(
                'Master, I am unable to finish your request, sorry.'
            );
            return;
        }
        await channel.send(
            `${target} got clowned by ${author}.<a:clowndance:845532985787940894>`
        );
    } else if (!target) {
        await channel.send(
            `You are so stupid that you can't even type the command right, I guess you are the real clown then.\nUsage of the command: \`\`\`!clown <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        target = member;
        typedWrongCommand = true;
    } else if (target.id === author.id) {
        if (member.roles.cache.has('845530033695096853')) {
            await channel.send('Slow Down. You are already a clown, jeez.');
            return;
        }
        await channel.send(
            `${author}, you have a weird interest, but yes you can be a clown yourself, now entertain us.`
        );
    } else if (target.roles.cache.has('845530033695096853')) {
        await channel.send(
            `${target} has already been clowned. Why are you so desperate? I guess you are the real clown then.`
        );
        target = member;
    } else if (
        (target.id !== member.id && Math.random() < 0.7) ||
        (member.id === '722951439567290458' && Math.random() < 0.95)
    ) {
        await channel.send(
            `${author} is trying clown ${target}. **BUT IT BACKFIRED, ${target} is now a clown LOL!!!**`
        );
        target = member;
    } else {
        await channel.send(
            `${target} got clowned by ${author}.<a:clowndance:845532985787940894>`
        );
    }
    const originalName = target.displayName;
    const howClown = typedWrongCommand ? 10 : Math.ceil(Math.random() * 10);
    const sentMessage = await channel.send(
        'https://media.tenor.com/images/87126cc81f03e22938d296cc5a60b2d2/tenor.gif'
    );
    await wait(4000);
    try {
        await Promise.all([
            target.setNickname('🤡'.repeat(howClown)),
            target.roles.add('845530033695096853'),
        ]);
    } catch (err) {
        // suppress error
    } finally {
        await sentMessage.edit(
            typedWrongCommand
                ? `${target} typed the wrong command. 100% clown!<a:clowndance:845532985787940894>`
                : `${target} is a ${
                      howClown * 10
                  }% clown.<a:clowndance:845532985787940894>`
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
        type: 'MEMBER_ROLE_UPDATE',
    });
    logs.entries.forEach(async entry => {
        if (Date.now() - entry.createdTimestamp <= 1000 * 60 * 7) {
            const member = guild.member((entry.target as Discord.User).id);
            if (member?.roles.cache.has('845530033695096853')) {
                await member.roles.remove('845530033695096853');
            }
        }
    });
}
