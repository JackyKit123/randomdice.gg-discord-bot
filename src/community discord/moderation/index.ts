import { setTimer } from 'community discord/timer';
import checkPermission from 'community discord/util/checkPermissions';
import { moderatorRoleIds } from 'config/roleId';
import { banAppealDiscordInvitePermaLink } from 'config/url';
import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    CommandInteraction,
    GuildMember,
    User,
} from 'discord.js';
import { ModLog } from 'util/cache';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';
import { suppressCannotDmUser, suppressUnknownBan } from 'util/suppressErrors';
import { sendBanMessage } from './banMessage';
import { writeModLog } from './modlog';
import Reasons from './reasons.json';

const actionNameToPastParticiple = (actionName: string) =>
    // eslint-disable-next-line no-nested-ternary
    actionName.includes('ban')
        ? `${actionName}ned`
        : actionName.includes('mute')
        ? `${actionName}d`
        : `${actionName}ed`;

export async function dmOffender(
    offender: User | GuildMember,
    moderator: GuildMember,
    action: ModLog['action'],
    reason: string | null,
    muteDuration: number | null
): Promise<void> {
    let dmReason = `You have been ${actionNameToPastParticiple(
        action
    )} by ${moderator} in ${moderator.guild.name}.${
        reason ? `\nReason: ${reason}` : ''
    }`;

    if (action === 'ban')
        dmReason += `\nFeel free to appeal here ${banAppealDiscordInvitePermaLink} if you found this ban to be unjustified.`;

    if (action === 'mute' && muteDuration) {
        dmReason += `\nYour mute last for ${parseMsIntoReadableText(
            muteDuration,
            true
        )}`;
    }
    await offender.send(dmReason).catch(suppressCannotDmUser);
}

export default async function moderation(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    if (!(await checkPermission(interaction, ...moderatorRoleIds))) return;
    const {
        member: moderator,
        options,
        channel,
        guild,
        client: { user: clientUser },
    } = interaction;
    const { members, ownerId, bans } = guild;
    const action = interaction.commandName as ModLog['action'];
    let reason = options.getString('reason');
    reason = (reason && Reasons[reason as keyof typeof Reasons]) || reason;
    const offender = options.getUser('member', true);
    const offenderMember = members.cache.get(offender.id);
    const durationArg = options.getString('duration');
    const deleteMessageDay = options.getInteger('delete-message-days');
    const actioned = actionNameToPastParticiple(action);

    if (offender.id === moderator.id) {
        await interaction.reply(`You cannot ${action} yourself.`);
        return;
    }

    if (
        moderator.id !== ownerId &&
        ((offenderMember &&
            offenderMember.roles.highest.position >=
                moderator.roles.highest.position) ||
            offender.id === ownerId ||
            offender === clientUser)
    ) {
        await interaction.reply(
            `You do not have enough permission to ${action} ${offender}.`
        );
        return;
    }

    if (
        offenderMember &&
        (members.cache.get(clientUser?.id ?? '')?.roles.highest.position ??
            0) <= offenderMember.roles.highest.position
    ) {
        await interaction.reply(
            `I do not have enough permission to ${action} ${offender}.`
        );
        return;
    }

    const offenderIsBanned = await bans
        .fetch(offender)
        .catch(suppressUnknownBan);
    let duration: number | null = null;

    switch (action) {
        case 'mute':
            if (!durationArg) {
                duration = 1000 * 60 * 60 * 24 * 7;
                break;
            }
            duration = parseStringIntoMs(durationArg);
            if (
                duration === null ||
                duration <= 0 ||
                duration > 1000 * 60 * 60 * 24 * 7
            ) {
                interaction.reply({
                    content:
                        'Invalid duration. Please provide a duration up to 1 week.',
                    ephemeral: true,
                });
                return;
            }
        // fallthrough
        case 'warn':
        case 'kick':
        case 'unmute':
            if (!offenderMember) {
                await interaction.reply(
                    `${offender} is not a member of the server.`
                );
                return;
            }
            break;
        case 'ban':
            if (offenderIsBanned) {
                await interaction.reply(
                    `${offender} is already banned from this server.`
                );
                return;
            }
            break;
        case 'unban':
            if (!offenderIsBanned) {
                await interaction.reply(
                    `${offender} is not banned from this server.`
                );
                return;
            }
            break;

        default:
    }

    const auditLogReason = `${actioned} by ${moderator.user.tag}${
        reason ? ` Reason: ${reason}` : ''
    }`;

    await dmOffender(offender, moderator, action, reason, duration);

    await writeModLog(offender, reason, moderator.user, action, duration);

    switch (action) {
        case 'kick':
            await members.kick(offender, auditLogReason);
            break;
        case 'ban':
            await members.ban(offender, {
                days:
                    deleteMessageDay || reason === Reasons['Scam Links']
                        ? 7
                        : 0,
                reason: auditLogReason,
            });
            await sendBanMessage(guild, offender, reason, moderator.user);
            break;
        case 'unban':
            await members.unban(offender, auditLogReason);
            break;
        case 'mute':
            await offenderMember?.timeout(duration, auditLogReason);
            break;
        case 'unmute':
            await offenderMember?.timeout(null, auditLogReason);
            break;
        default:
    }
    await interaction.reply(
        `${offender} has been ${actioned} ${(reason && `for ${reason}`) || ''}.`
    );
    if (reason === Reasons['Warn to Leave Hack Servers'] && channel) {
        await setTimer(
            channel,
            moderator,
            `Ban ${offenderMember?.displayName ?? 'this member'} in 24 hours.`,
            1000 * 60 * 60 * 24
        );
    }
}

const getCommonOptions = (
    commandName: string,
    reasonIsAutoComplete = false
): ApplicationCommandOptionData[] => [
    {
        name: 'member',
        description: `The member to be ${actionNameToPastParticiple(
            commandName
        )}.`,
        type: 'USER',
        required: true,
    },
    {
        name: 'reason',
        description: `The reason to ${commandName} the member.`,
        type: 'STRING',
        required: false,
        autocomplete: reasonIsAutoComplete,
    },
];

export const commandData: ApplicationCommandData[] = [
    {
        name: 'warn',
        defaultPermission: false,
        description: 'Warn a member.',
        options: getCommonOptions('warn', true),
    },
    {
        name: 'kick',
        defaultPermission: false,
        description: 'Kick a member.',
        options: getCommonOptions('kick', true),
    },
    {
        name: 'ban',
        defaultPermission: false,
        description: 'Ban a member.',
        options: [
            ...getCommonOptions('ban', true),
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
            ...getCommonOptions('mute', true),
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

export { hackDiscussionLogging, hackLogBanHandler } from './logHackWordTrigger';
