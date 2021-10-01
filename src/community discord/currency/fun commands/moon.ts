import Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from '../../../util/cooldown';
import fetchMention from '../../../util/fetchMention';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function moon(message: Discord.Message): Promise<void> {
    const { content, author, guild, channel } = message;

    if (!guild) {
        return;
    }

    const memberArg = content.split(' ')?.[1];
    if (author.id === '722951439567290458') {
        await channel.send("No you can't use `!moon`, get rekt.");
        return;
    }

    const target = await fetchMention(memberArg, guild, {
        content,
        mentionIndex: 1,
    });
    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!moon <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }
    if (target.user.bot) {
        await channel.send('Cannot use this command on a bot.');
        return;
    }
    if (target.id === author.id) {
        await channel.send(
            `${author.toString()}, why are your mooning yourself? <:what:770517830852542475>`
        );
        return;
    }
    if (target.roles.cache.has('804508975503638558')) {
        await channel.send(
            `${target.toString()} has already been mooned, wait a bit before your moon again.`
        );
        return;
    }
    if (
        await cooldown(message, '!moon', {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 5,
        })
    ) {
        return;
    }
    if (!(await commandCost(message, 100))) return;
    const originalName = target.displayName;
    const randomMoonEmoji = [
        '🌝',
        '🌕',
        '🌗',
        '🌘',
        '🌖',
        '🌙',
        '🌛',
        '🌚',
        '🌑',
        '🌓',
        '🌒',
        '🌔',
        '☪',
        '☾',
        '☽',
    ][Math.floor(Math.random() * 15)];
    const sentMessage = await channel.send(`${target.toString()}...🌚`);
    await wait(500);
    await sentMessage.edit(`${target.toString()}...🌘`);
    await wait(500);
    await sentMessage.edit(`${target.toString()}...🌗`);
    await wait(500);
    await sentMessage.edit(`${target.toString()}...🌗`);
    await wait(500);
    await sentMessage.edit(`${target.toString()}...🌖`);
    await wait(500);
    await sentMessage.edit(`${target.toString()}...🌝`);
    await wait(500);
    try {
        await Promise.all([
            target.setNickname(
                originalName.length >= 30
                    ? `${originalName.slice(0, 29)}…${randomMoonEmoji}`
                    : `${originalName}${randomMoonEmoji}`
            ),
            target.roles.add('804508975503638558'),
        ]);
    } catch (err) {
        // suppress error
    } finally {
        await sentMessage.edit(
            `${target.toString()}...You have been mooned! 💩`
        );
        await wait(1000 * 60 * 5);
        try {
            if (target.roles.cache.has('804508975503638558')) {
                await target.roles.remove('804508975503638558');
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
    if (!client.user) return;
    const guild = await client.guilds.fetch('804222694488932362');
    const logs = await guild.fetchAuditLogs({
        user: client.user,
        type: 'MEMBER_ROLE_UPDATE',
    });
    logs.entries.forEach(async entry => {
        if (!(entry.target instanceof Discord.User)) return;
        if (Date.now() - entry.createdTimestamp <= 1000 * 60 * 7) {
            const member = guild.members.cache.get(entry.target.id);
            if (member?.roles.cache.has('804508975503638558')) {
                await member.roles.remove('804508975503638558');
            }
        }
    });
}
