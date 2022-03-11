import {
    ApplicationCommandData,
    CommandInteraction,
    NonThreadGuildBasedChannel,
    PermissionString,
} from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';

const wait = promisify(setTimeout);

export default async function lockUnlock(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { guild, channel, member } = interaction;

    const commandName = interaction.commandName as 'lock' | 'unlock';

    if (
        !channel ||
        (await cooldown(interaction, commandName, {
            default: 2 * 1000,
            donator: 2 * 1000,
        }))
    ) {
        return;
    }

    const target = interaction.options.getChannel('channel') ?? channel;
    let timer =
        parseStringIntoMs(interaction.options.getString('time') ?? '') ?? 0;

    const { everyone } = guild.roles;
    async function updateChannelPermission(
        action: 'lock' | 'unlock',
        replyAction: 'reply' | 'editReply'
    ): Promise<void> {
        const permissionForEveryone = target.permissionsFor(everyone.id);

        const execute = async (
            ch: NonThreadGuildBasedChannel,
            ...permissions: PermissionString[]
        ): Promise<boolean> => {
            if (
                permissionForEveryone &&
                ((action === 'lock' &&
                    permissions.every(
                        permission =>
                            permissionForEveryone.serialize()[permission]
                    ) === false) ||
                    (action === 'unlock' &&
                        permissions.every(permission =>
                            permissionForEveryone.has(permission)
                        )))
            ) {
                await interaction[replyAction](`${ch} is already ${action}ed.`);
                return false;
            }

            await ch.permissionOverwrites.edit(
                everyone,
                Object.fromEntries(
                    permissions.map(permission => [
                        permission,
                        action === 'lock' ? false : null,
                    ])
                )
            );
            return true;
        };

        let executeSuccess = false;
        if (target.isVoice()) {
            executeSuccess = await execute(target, 'CONNECT');
        } else if (target.isText() && !target.isThread()) {
            executeSuccess = await execute(target, 'SEND_MESSAGES');
        } else if (target.isThread()) {
            if (target.parent)
                executeSuccess = await execute(target.parent, 'SEND_MESSAGES');
        } else {
            await interaction[replyAction](
                `${target} is not a channel that can be ${commandName}ed.`
            );
        }
        if (!executeSuccess) return;

        const statusMessage = `${
            action === 'lock' ? 'Locked down' : 'Unlocked'
        } ${target}${
            timer > 0 ? ` for **${parseMsIntoReadableText(timer)}**` : ''
        }.`;
        if (channel?.id !== target.id && target.isText()) {
            await target.send(statusMessage);
        }
        await interaction[replyAction](statusMessage);
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
        interaction.reply(
            `You don't have permission to ${commandName} ${target}`
        );
        return;
    }

    if (timer !== 0 && (timer > 2147483647 || timer <= 3000)) {
        await interaction.reply(
            `Delay **${parseMsIntoReadableText(timer)}** is too ${
                timer <= 3000 ? 'short' : 'long'
            }.`
        );
        return;
    }

    await updateChannelPermission(commandName, 'reply');
    if (timer === 0) return;
    await wait(timer);
    timer = 0;
    await updateChannelPermission(
        commandName === 'lock' ? 'unlock' : 'lock',
        'editReply'
    );
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
                channelTypes: ['GUILD_TEXT', 'GUILD_VOICE'],
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
                channelTypes: ['GUILD_TEXT', 'GUILD_VOICE'],
            },
        ],
    },
];
