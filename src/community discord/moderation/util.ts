import { setTimer } from 'community discord/timer';
import { isCommunityDiscord } from 'config/guild';
import { banAppealDiscordInvitePermaLink } from 'config/url';
import {
    ButtonInteraction,
    CommandInteraction,
    GuildMember,
    GuildTextBasedChannel,
    User,
} from 'discord.js';
import { ModLog } from 'util/cache';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';
import { suppressCannotDmUser, suppressUnknownBan } from 'util/suppressErrors';

export const checkModActionValidity = async (
    interaction: ButtonInteraction<'cached'> | CommandInteraction<'cached'>,
    offenderId: string,
    action: ModLog['action'],
    muteDurationArg?: string | null
): Promise<boolean> => {
    const {
        member: moderator,
        guild: { ownerId, members, bans },
        client: { user: clientUser },
    } = interaction;
    const offenderMember = members.cache.get(offenderId);

    if (!clientUser) return false;

    if (!moderator.permissions.has('BAN_MEMBERS')) {
        await interaction.reply({
            content:
                'You lack permission to execute this command, required permission: `BAN_MEMBERS`',
            ephemeral: true,
        });
        return false;
    }

    if (
        (action === 'ban' || action === 'unban') &&
        !members.cache.get(clientUser.id)?.permissions.has('BAN_MEMBERS')
    ) {
        await interaction.reply({
            content:
                'I lack permission to execute this command, please give me the permission and try again.',
            ephemeral: true,
        });
        return false;
    }

    if (offenderId === interaction.user.id) {
        await interaction.reply(`You cannot ${action} yourself.`);
        return false;
    }
    if (
        moderator.id !== ownerId &&
        ((offenderMember &&
            offenderMember.roles.highest.position >=
                moderator.roles.highest.position) ||
            offenderId === ownerId ||
            offenderId === clientUser?.id)
    ) {
        await interaction.reply(
            `You do not have enough permission to ${action} <@${offenderId}>.`
        );
        return false;
    }

    if (
        offenderMember &&
        (members.cache.get(clientUser?.id ?? '')?.roles.highest.position ??
            0) <= offenderMember.roles.highest.position
    ) {
        await interaction.reply(
            `I do not have enough permission to ${action} <@${offenderId}>.`
        );
        return false;
    }

    const offenderIsBanned = await bans
        .fetch(offenderId)
        .catch(suppressUnknownBan);
    let duration: number | null = null;

    switch (action) {
        case 'mute':
            if (!muteDurationArg) {
                duration = 1000 * 60 * 60 * 24 * 7;
            } else {
                duration = parseStringIntoMs(muteDurationArg);
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
                    return false;
                }
            }
        // fallthrough
        case 'warn':
        case 'kick':
        case 'unmute':
            if (!offenderMember) {
                await interaction.reply(
                    `<@${offenderId}> is not a member of the server.`
                );
                return false;
            }
            break;
        case 'ban':
            if (offenderIsBanned) {
                await interaction.reply(
                    `<@${offenderId}> is already banned from this server.`
                );
                return false;
            }
            break;
        case 'unban':
            if (!offenderIsBanned) {
                await interaction.reply(
                    `<@${offenderId}> is not banned from this server.`
                );
                return false;
            }
            break;

        default:
    }

    return true;
};

export const actionNameToPastParticiple = (actionName: string): string =>
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

    if (action === 'ban' && isCommunityDiscord(moderator.guild))
        dmReason += `\nFeel free to appeal here ${banAppealDiscordInvitePermaLink} if you found this ban to be unjustified.`;

    if (action === 'mute' && muteDuration) {
        dmReason += `\nYour mute last for ${parseMsIntoReadableText(
            muteDuration,
            true
        )}`;
    }
    await offender.send(dmReason).catch(suppressCannotDmUser);
}

export const startHackWarnTimer = async (
    moderator: GuildMember,
    offenderMember: GuildMember | undefined,
    channel: GuildTextBasedChannel | null
): Promise<void> => {
    if (channel)
        await setTimer(
            channel,
            moderator,
            `Ban ${offenderMember?.displayName ?? 'this member'} in 24 hours.`,
            1000 * 60 * 60 * 24
        );
};
