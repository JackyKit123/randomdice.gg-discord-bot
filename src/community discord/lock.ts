import * as Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from '../helper/cooldown';
import parseMsIntoReadableText, { parseStringIntoMs } from '../helper/parseMS';

const wait = promisify(setTimeout);

export default async function lockUnlock(
    message: Discord.Message
): Promise<void> {
    const { member, channel, content, guild, author } = message;

    const [command, ...args] = content.split(' ');

    if (!(command === '!lock' || command === '!unlock') || !member || !guild) {
        return;
    }

    if (
        await cooldown(message, '!lock', {
            default: 2 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const channelRegex = /^(?:<#(\d{18})>|(\d{18}))$/;
    const anotherChannelArg = args?.[0]?.match(channelRegex);
    const timer =
        parseStringIntoMs(args?.[0]) ?? parseStringIntoMs(args?.[1]) ?? 0;

    const target = guild.channels.cache.get(
        anotherChannelArg?.[1] || anotherChannelArg?.[2] || channel.id
    ) as Discord.TextChannel;

    const { everyone } = guild.roles;
    async function lock(): Promise<void> {
        if (
            target.permissionsFor(everyone.id)?.serialize().SEND_MESSAGES ===
            false
        ) {
            await channel.send(`${target} is already locked.`);
            return;
        }

        target.updateOverwrite(everyone, {
            SEND_MESSAGES: false,
        });
        await channel.send(
            `Locked down ${target}${
                timer > 0 ? ` for **${parseMsIntoReadableText(timer)}**` : ''
            }.`
        );
    }

    async function unlock(): Promise<void> {
        if (target.permissionsFor(everyone.id)?.has('SEND_MESSAGES')) {
            await channel.send(`${target} is already unlocked.`);
            return;
        }
        target.updateOverwrite(everyone, {
            SEND_MESSAGES: null,
        });
        await channel.send(
            `Unlocked channel ${target}${
                timer > 0 ? ` for **${parseMsIntoReadableText(timer)}**` : ''
            }.`
        );
    }
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
            if (timer > 2147483647 || timer <= 3000) {
                if (timer === 0) {
                    lock();
                    return;
                }
                await channel.send(
                    `Delay **${parseMsIntoReadableText(timer)}** is too ${
                        timer <= 3000 ? 'short' : 'long'
                    }.`
                );
            } else {
                lock();
                await wait(timer);
                unlock();
            }
            return;
        }
        if (command === '!unlock') {
            if (timer > 2147483647 || timer <= 3000) {
                if (timer === 0) {
                    unlock();
                    return;
                }
                await channel.send(
                    `Delay **${parseMsIntoReadableText(timer)}** is too ${
                        timer <= 3000 ? 'short' : 'long'
                    }.`
                );
            } else {
                unlock();
                await wait(timer);
                lock();
            }
            return;
        }
    }
    await channel.send(
        `You don't have permission to ${command.replace('!', '')} ${target}`
    );
}
