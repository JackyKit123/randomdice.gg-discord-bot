import checkPermission from 'community discord/util/checkPermissions';
import { moderatorRoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    CommandInteraction,
    GuildMember,
    User,
} from 'discord.js';
import { ModLog } from 'util/cache';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';
import { suppressCannotDmUser } from 'util/suppressErrors';
import { sendBanMessage } from './banMessage';
import { writeModLog } from './modlog';
import { hackban, hackwarn } from './quickMod';

export const warn = async (
    target: User,
    reason: string | null,
    moderator: GuildMember
): Promise<void> => {
    await target
        .send(
            `You have been warned by ${moderator} in ${
                moderator.guild.name
            }.\nReason: ${reason ?? 'Not provided'}.`
        )
        .catch(suppressCannotDmUser);
};

const kick = async (
    target: User,
    reason: string | null,
    moderator: GuildMember
) => {
    const { guild } = moderator;
    await target
        .send(
            `You have been kicked in ${guild.name}.\nReason: ${
                reason ?? 'Not provided'
            }.`
        )
        .catch(suppressCannotDmUser);
    await guild.members.kick(target, reason ?? undefined);
};

export const ban = async (
    target: User,
    reason: string | null,
    moderator: GuildMember,
    deleteMessageDays: number | null
): Promise<void> => {
    await target
        .send(
            `You have been banned in ${moderator.guild.name}.\nReason: ${
                reason ?? 'Not provided'
            }.\nFeel free to appeal here https://discord.gg/yJBdSRZJmS if you found this ban to be unjustified.`
        )
        .catch(suppressCannotDmUser);
    await moderator.guild.members.ban(target, {
        reason: reason ?? undefined,
        days: deleteMessageDays || undefined,
    });
    await sendBanMessage(moderator.guild, target, reason, moderator.user);
};

const unban = async (
    target: User,
    reason: string | null,
    moderator: GuildMember
) => {
    await moderator.guild.members.unban(target, reason ?? undefined);
};

const unmute = async (
    target: GuildMember,
    reason: string | null,
    moderator: GuildMember
) => {
    await target.timeout(
        null,
        `${target} unmuted by ${moderator} for ${reason}`
    );
};

const mute = async (
    target: GuildMember,
    reason: string | null,
    moderator: GuildMember,
    duration: number | null
) => {
    // eslint-disable-next-line no-param-reassign
    duration = duration ?? 604800000;
    const durationText = duration;
    parseMsIntoReadableText(duration);

    await target
        .send(
            `You have been muted  by ${moderator} in ${
                target.guild
            } for ${durationText}.\nReason: ${reason ?? 'Not provided'}.`
        )
        .catch(suppressCannotDmUser);
    await target.timeout(
        duration,
        `${target} muted by ${moderator} for ${reason ?? undefined}`
    );
};

export default async function moderation(
    interaction: CommandInteraction
): Promise<void> {
    if (
        !interaction.inCachedGuild() ||
        !(await checkPermission(interaction, ...moderatorRoleIds))
    )
        return;
    const {
        member,
        options,
        commandName,
        guild,
        channel,
        client: { user: clientUser },
    } = interaction;
    const reason = options.getString('reason');
    const target = options.getUser('member', true);
    const targetMember = guild.members.cache.get(target.id);
    const durationArg = options.getString('duration');
    const deleteMessageDay = options.getInteger('delete-message-days');

    if (!(await checkPermission(interaction, ...moderatorRoleIds))) return;

    if (target.id === member.id) {
        await interaction.reply(`You cannot ${commandName} yourself.`);
        return;
    }

    if (
        member.id === guild.ownerId &&
        !(
            (targetMember &&
                targetMember.roles.highest.position >=
                    member.roles.highest.position) ||
            target.id === guild.ownerId ||
            target.id === clientUser?.id
        )
    ) {
        await interaction.reply(
            `You do not have enough permission to ${commandName} ${target}.`
        );
        return;
    }

    if (
        targetMember &&
        (guild.members.cache.get(clientUser?.id ?? '')?.roles.highest
            .position ?? 0) <= targetMember.roles.highest.position
    ) {
        await interaction.reply(
            `I do not have enough permission to ${commandName} ${target}.`
        );
        return;
    }

    if (commandName === 'unban' && !guild.bans.cache.get(target.id)) {
        await interaction.reply(`${target} is not banned in this server.`);
        return;
    }

    if (
        (commandName.includes('mute') ||
            commandName.includes('warn') ||
            commandName.includes('kick')) &&
        !targetMember
    ) {
        await interaction.reply(`${target} is not in this server.`);
        return;
    }

    await writeModLog(
        target,
        reason,
        member.user,
        commandName as ModLog['action']
    );

    let duration: number | null = null;
    if (durationArg) {
        duration = parseStringIntoMs(durationArg);
        if (duration === null) {
            interaction.reply({
                content: 'Invalid duration. Please use a valid duration.',
                ephemeral: true,
            });
            return;
        }
    }

    switch (commandName) {
        case 'warn':
            await warn(target, reason, member);
            break;
        case 'kick':
            await kick(target, reason, member);
            break;
        case 'ban':
            await ban(target, reason, member, deleteMessageDay);
            break;
        case 'unban':
            await unban(target, reason, member);
            break;
        case 'mute':
            await mute(targetMember as GuildMember, reason, member, duration);
            break;
        case 'unmute':
            await unmute(targetMember as GuildMember, reason, member);
            break;
        case 'hackwarn':
            await hackwarn(target, member, channel);
            break;
        case 'hackban':
            await hackban(target, member);
            break;
        default:
    }

    await interaction.reply(
        `${target} has been ${commandName}${
            // eslint-disable-next-line no-nested-ternary
            commandName.includes('ban')
                ? 'ne'
                : commandName.includes('mute')
                ? ''
                : 'e'
        }d.`
    );
}

const getCommonOptions = (
    commandName: string
): ApplicationCommandOptionData[] => [
    {
        name: 'member',
        description: `The member to be ${commandName}${
            // eslint-disable-next-line no-nested-ternary
            commandName.includes('ban')
                ? 'ne'
                : commandName.includes('mute')
                ? ''
                : 'e'
        }d.`,
        type: 'USER',
        required: true,
    },
    {
        name: 'reason',
        description: `The reason for ${commandName}ing the member.`,
        type: 'STRING',
        required: false,
    },
];

export const commandData: ApplicationCommandData[] = [
    {
        name: 'warn',
        defaultPermission: false,
        description: 'Warn a member.',
        options: getCommonOptions('warn'),
    },
    {
        name: 'kick',
        defaultPermission: false,
        description: 'Kick a member.',
        options: getCommonOptions('kick'),
    },
    {
        name: 'ban',
        defaultPermission: false,
        description: 'Ban a member.',
        options: [
            ...getCommonOptions('ban'),
            {
                name: 'delete-message-days',
                description:
                    "The number of days to delete the member's messages.",
                type: 'INTEGER',
                minValue: 0,
            },
        ],
    },
    {
        name: 'unban',
        defaultPermission: false,
        description: 'Unban a member.',
        options: getCommonOptions('unban'),
    },
    {
        name: 'mute',
        defaultPermission: false,
        description: 'Mute a member.',
        options: [
            ...getCommonOptions('mute'),
            {
                name: 'duration',
                description:
                    'The duration of the mute. Default to 1 week (longest possible timeout). Use a valid duration string.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'unmute',
        defaultPermission: false,
        description: 'Unmute a member.',
        options: getCommonOptions('unmute'),
    },
];
