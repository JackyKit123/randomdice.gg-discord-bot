import {
    ApplicationCommandData,
    CommandInteraction,
    GuildBasedChannel,
    Message,
} from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';
import { edit, reply } from 'util/typesafeReply';

const wait = promisify(setTimeout);

export default async function lockUnlock(
    input: Message | CommandInteraction
): Promise<void> {
    const { channel, guild } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');

    const command = (
        input instanceof Message
            ? input.content.split(' ')[0]?.replace('!', '')
            : input.commandName
    ) as 'lock' | 'unlock';

    if (!member || !guild || !channel || channel.type === 'DM') return;

    if (
        await cooldown(input, '!lock', {
            default: 2 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    let timer = 0;
    let target: GuildBasedChannel = channel;
    if (input instanceof Message) {
        const args = input.content.split(' ').slice(1);
        const channelRegex = /^(?:<#(\d{18})>|(\d{18}))$/;
        const anotherChannelArg = args?.[0]?.match(channelRegex);
        timer =
            parseStringIntoMs(args?.[0]) ?? parseStringIntoMs(args?.[1]) ?? 0;

        target =
            guild.channels.cache.get(
                anotherChannelArg?.[1] || anotherChannelArg?.[2] || channel.id
            ) ?? target;
    } else {
        target =
            guild.channels.cache.get(
                input.options.getChannel('channel')?.id ?? target.id
            ) ?? target;
        timer = parseStringIntoMs(input.options.getString('time') ?? '') ?? 0;
    }

    const { everyone } = guild.roles;
    async function updateChannelPermission(
        action: 'lock' | 'unlock',
        replyAction: typeof reply | typeof edit
    ): Promise<void> {
        const permissionForEveryone = target?.permissionsFor(everyone.id);
        const isAlreadyLocked = async () =>
            (input instanceof Message ? reply : replyAction)(
                input,
                `${target} is already ${action}ed.`
            );
        if (target?.isVoice()) {
            if (
                (action === 'lock' &&
                    permissionForEveryone?.serialize().CONNECT === false) ||
                (action === 'unlock' && permissionForEveryone?.has('CONNECT'))
            ) {
                await isAlreadyLocked();
                return;
            }

            await target.permissionOverwrites.edit(everyone, {
                CONNECT: action === 'lock' ? false : null,
            });
        }
        if (target && target.isText() && !target.isThread()) {
            if (
                (action === 'lock' &&
                    permissionForEveryone?.serialize().SEND_MESSAGES ===
                        false) ||
                (action === 'unlock' &&
                    permissionForEveryone?.has('SEND_MESSAGES'))
            ) {
                await isAlreadyLocked();
                return;
            }

            await target.permissionOverwrites.edit(everyone, {
                SEND_MESSAGES: action === 'lock' ? false : null,
                SEND_MESSAGES_IN_THREADS: action === 'lock' ? false : null,
            });
        }
        if (target.isThread() && target.parent) {
            if (
                (action === 'lock' &&
                    permissionForEveryone?.serialize()
                        .SEND_MESSAGES_IN_THREADS === false) ||
                (action === 'unlock' &&
                    permissionForEveryone?.has('SEND_MESSAGES_IN_THREADS'))
            ) {
                await isAlreadyLocked();
                return;
            }

            await target.parent.permissionOverwrites.edit(everyone, {
                SEND_MESSAGES_IN_THREADS: action === 'lock' ? false : null,
            });
        }
        const statusMessage = `${
            action === 'lock' ? 'Locked down' : 'Unlocked'
        } ${target}${
            timer > 0 ? ` for **${parseMsIntoReadableText(timer)}**` : ''
        }.`;
        if (channel?.id !== target.id && target.isText()) {
            await target.send(statusMessage);
        }
        await (input instanceof Message ? reply : replyAction)(
            input,
            statusMessage
        );
    }

    if (
        !(
            target?.permissionsFor(member)?.has('MANAGE_ROLES') ||
            (target.isThread()
                ? target.parent
                : target
            )?.permissionOverwrites.cache.some(
                perm =>
                    perm.allow.has(
                        target.type === 'GUILD_VOICE'
                            ? 'CONNECT'
                            : 'SEND_MESSAGES'
                    ) &&
                    (member.roles.cache.has(perm.id) || member.id === perm.id)
            ) ||
            member.permissions.has('ADMINISTRATOR')
        )
    ) {
        reply(
            input,
            `You don't have permission to ${command.replace('!', '')} ${target}`
        );
        return;
    }

    if (timer !== 0 && (timer > 2147483647 || timer <= 3000)) {
        await reply(
            input,
            `Delay **${parseMsIntoReadableText(timer)}** is too ${
                timer <= 3000 ? 'short' : 'long'
            }.`
        );
        return;
    }

    await updateChannelPermission(command, reply);
    if (timer === 0) return;
    await wait(timer);
    timer = 0;
    await updateChannelPermission(command === 'lock' ? 'unlock' : 'lock', edit);
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'lock',
        description: 'Locks a channel',
        options: [
            {
                name: 'time',
                description: 'Time string, leave blank for permanent lock',
                type: 3,
            },
            {
                name: 'channel',
                description: 'The channel to lock',
                type: 7,
            },
        ],
    },
    {
        name: 'unlock',
        description: 'Unlocks a channel',
        options: [
            {
                name: 'time',
                description: 'Time string, leave blank for permanent unlock',
                type: 3,
            },
            {
                name: 'channel',
                description: 'The channel to unlock',
                type: 7,
            },
        ],
    },
];
