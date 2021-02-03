import * as Discord from 'discord.js';
import { promisify } from 'util';
import cooldown from '../helper/cooldown';

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
    const timerRegex = /^(?:(\d*)d)?(?:(\d*)h)?(?:(\d*)m)?(?:(\d*)s)?$/;
    const anotherChannelArg = args?.[0]?.match(channelRegex);
    const timerArg =
        args?.[0]?.match(timerRegex) || args?.[1]?.match(timerRegex);

    let [day, hour, minute, second] = [0, 0, 0, 0];
    let timer = 0;
    if (timerArg) {
        [, day, hour, minute, second] = Array.from(timerArg).map(
            arg => Number(arg) || 0
        );
        timer =
            (second + minute * 60 + hour * 60 * 60 + day * 60 * 60 * 24) * 1000;
    }

    const parseMsIntoReadableText = (ms: number): string => {
        const d = Math.floor(ms / (1000 * 60 * 60 * 24));
        const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        const tenthseconds = Math.floor((ms % 1000) / 100);

        return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${
            m > 0 ? `${m}m ` : ''
        }${seconds}${tenthseconds > 0 ? `.${tenthseconds}` : ''}s`;
    };
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
            lock();
            await wait(timer);
            timer = 0;
            unlock();
            return;
        }
        if (command === '!unlock') {
            unlock();
            await wait(timer);
            timer = 0;
            lock();
            return;
        }
    }
    await channel.send(
        `You don't have permission to ${command.replace('!', '')} ${target}`
    );
}
