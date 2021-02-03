import * as Discord from 'discord.js';
import cooldown from '../helper/cooldown';

export default async function lockUnlock(
    message: Discord.Message
): Promise<void> {
    const { member, channel, content, guild, author } = message;

    const [command, ...args] = content.split(' ');

    if (!(command === '!lock' || command === '!unlock') || !member || !guild) {
        return;
    }

    if (
        await cooldown(message, '!eventping', {
            default: 2 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const anotherChannelArg = args?.[0]?.match(/^(?:<#(\d{18})>|(\d{18}))$/);
    const target = guild.channels.cache.get(
        anotherChannelArg?.[1] || anotherChannelArg?.[2] || channel.id
    ) as Discord.TextChannel;

    const { everyone } = guild.roles;
    if (
        (target.permissionsFor(member)?.has('MANAGE_ROLES') &&
            target.permissionOverwrites.some(
                perm =>
                    perm.allow.has('SEND_MESSAGES') &&
                    (member.roles.cache.has(perm.id) || author.id === perm.id)
            )) ||
        member.permissions.has('ADMINISTRATOR')
    ) {
        if (command === '!lock') {
            if (
                target.permissionsFor(everyone.id)?.serialize()
                    .SEND_MESSAGES === false
            ) {
                await channel.send(`${target} is already locked.`);
                return;
            }

            target.updateOverwrite(everyone, {
                SEND_MESSAGES: false,
            });
            await channel.send(`Locked down ${target}.`);
            return;
        }
        if (command === '!unlock') {
            if (target.permissionsFor(everyone.id)?.has('SEND_MESSAGES')) {
                await channel.send(`${target} is already unlocked.`);
                return;
            }
            target.updateOverwrite(everyone, {
                SEND_MESSAGES: null,
            });
            await channel.send(`Unlocked channel ${target}.`);
            return;
        }
    }
    await channel.send(
        `You don't have permission to ${command.replace('!', '')} ${target}`
    );
}
