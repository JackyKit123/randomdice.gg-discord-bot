import * as Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from '../../helper/cooldown';
import fetchMention from '../../helper/fetchMention';

const wait = promisify(setTimeout);

export default async function custom(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { content, author, guild, channel, member } = message;

    if (!guild) {
        return;
    }

    const memberArg = content.split(' ')?.[1];

    if (author.id !== '722951439567290458') {
        const member = guild.member('722951439567290458');
        const memberStr = member
            ? `**${member.user.username}#${member.user.discriminator}**`
            : '<@722951439567290458>';
        await channel.send(
            `This is a private command dedicated to ${memberStr} as a perk of $50 Patreon Donator.`
        );
        return;
    }
    if (!member?.roles.cache.has('805727466219372546')) {
        await channel.send('You are no longer $50 Patreon and you can no longer use this command.');
        return;
    }
    if (
        await cooldown(message, '!moon', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
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
    const clientRole = (guild.member(
        (client.user as Discord.ClientUser).id
    ) as Discord.GuildMember).roles.highest;
    const targetRole = target.roles.highest;
    if (clientRole.comparePositionTo(targetRole) <= 0) {
        await channel.send(
            `I am not high enough in the role hierarchy to \`moon\` this member.`
        );
        return;
    }
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
    await Promise.all([
        target.setNickname(
            originalName.length >= 30
                ? `${originalName.slice(0, 29)}…${randomMoonEmoji}`
                : `${originalName}${randomMoonEmoji}`
        ),
        target.roles.add('804508975503638558'),
    ]);
    await sentMessage.edit(
        `${target.toString()}...You have been mooned! <a:Taxi:780350572212781086>`
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
            if (member?.roles.cache.has('804508975503638558')) {
                await member.roles.remove('804508975503638558');
            }
        }
    });
}
