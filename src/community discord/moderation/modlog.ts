import checkPermission from 'community discord/util/checkPermissions';
import channelIds from 'config/channelIds';
import { getCommunityDiscord } from 'config/guild';
import { moderatorRoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    ColorResolvable,
    CommandInteraction,
    GuildAuditLogsActions,
    GuildAuditLogsEntry,
    GuildBan,
    GuildMember,
    Message,
    MessageEmbed,
    PartialGuildMember,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import cacheData, { ModLog } from 'util/cache';
import getPaginationComponents from 'util/paginationButtons';
import parseMsIntoReadableText from 'util/parseMS';
import {
    suppressUnknownMember,
    suppressUnknownUser,
} from 'util/suppressErrors';
import Reasons from './reasons.json';

function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

async function getExistingModLogEntry(
    interaction: CommandInteraction
): Promise<{
    modlog: ModLog;
    logMessage?: Message;
} | null> {
    if (!interaction.inCachedGuild()) return null;
    const {
        options,
        guild,
        client: { user: clientUser },
    } = interaction;
    if (!clientUser) return null;

    const caseNumber = options.getInteger('case', true);
    const cases = cacheData['discord_bot/community/modlog'];
    const logChannel = guild?.channels.cache.get(channelIds['public-mod-log']);
    if (!logChannel?.isText()) {
        await interaction.reply(
            'The mod log channel is not located, please contact an admin.'
        );
        return null;
    }
    const existingModlogCase = cases.find(log => log.case === caseNumber);
    if (!existingModlogCase) {
        await interaction.reply(
            `Case #${caseNumber} does not exist, or has already been deleted.`
        );
        return null;
    }

    const messages = await logChannel.messages.fetch({ limit: 100 });
    const message = messages.find(
        m =>
            clientUser.id === m.author.id &&
            m?.embeds?.[0]?.author?.name === `Case ${caseNumber}`
    );
    return {
        modlog: existingModlogCase,
        logMessage: message,
    };
}

async function deleteModLogEntry(
    interaction: CommandInteraction
): Promise<void> {
    const existingEntry = await getExistingModLogEntry(interaction);
    if (!existingEntry?.modlog) return;
    const filteredCases = cacheData['discord_bot/community/modlog'].filter(
        log => log.case !== existingEntry.modlog.case
    );
    await database.ref(`discord_bot/community/modlog`).set(filteredCases);
    if (existingEntry.logMessage) await existingEntry.logMessage.delete();
    await interaction.reply(
        `Case #${existingEntry.modlog.case} has been deleted.`
    );
}

async function editModLogEntryReason(
    interaction: CommandInteraction
): Promise<void> {
    const existingEntry = await getExistingModLogEntry(interaction);
    let reason = interaction.options.getString('reason', true);
    reason = (reason && Reasons[reason as keyof typeof Reasons]) || reason;
    if (!existingEntry?.modlog) return;
    const edited = { ...existingEntry.modlog, reason };
    await database
        .ref(`discord_bot/community/modlog`)
        .set(
            cacheData['discord_bot/community/modlog'].map(log =>
                log.case === edited.case ? edited : log
            )
        );

    if (existingEntry.logMessage) {
        const editedEmbed = existingEntry.logMessage.embeds[0];
        await existingEntry.logMessage.edit({
            embeds: [editedEmbed.setDescription(reason)],
        });
    }
    await interaction.reply(
        `The reason for case #${existingEntry.modlog.case} has been edited.`
    );
}

export default async function modlog(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { user, options, member, guild } = interaction;
    const subCommand = options.getSubcommand();
    switch (subCommand) {
        case 'remove':
            await deleteModLogEntry(interaction);
            return;
        case 'edit-reason':
            await editModLogEntryReason(interaction);
            return;
        case 'inspect':
            break;
        default:
    }
    const target = options.getUser('member', true);
    const targetMember = await guild.members
        .fetch(target.id)
        .catch(suppressUnknownUser)
        .catch(suppressUnknownMember);

    if (!(await checkPermission(interaction, ...moderatorRoleIds))) return;

    if (
        targetMember &&
        (targetMember.roles.highest.position > member.roles.highest.position ||
            target.id === guild.ownerId) &&
        member.id !== guild.ownerId
    ) {
        await interaction.reply(
            `You cannot view logs for a user with a higher role than you.`
        );
        return;
    }
    const type = options.getString('log-type') ?? 'all';
    const cases = cacheData['discord_bot/community/modlog']
        .filter(({ offender, action }) => {
            if (offender !== target.id) return false;
            switch (type) {
                case 'bans':
                case 'kicks':
                    return (
                        action === 'ban' ||
                        action === 'unban' ||
                        action === 'kick'
                    );
                case 'mutes':
                    return action === 'mute' || action === 'unmute';
                case 'warnings':
                    return action === 'warn';
                default:
                    return type === 'all';
            }
        })
        .sort((a, b) => b.case - a.case);
    const embeds = cases.length
        ? new Array(Math.ceil(cases.length / 5)).fill('').map((_, i) =>
              new MessageEmbed()
                  .setAuthor({
                      name: `${
                          targetMember?.displayName ?? target.username
                      }'s ${type !== 'all' ? capitalize(type) : 'Mod'} Log`,
                      iconURL: target.displayAvatarURL({ dynamic: true }),
                  })
                  .addFields(
                      cases
                          .slice(i * 5, i * 5 + 5)
                          .map(
                              ({
                                  case: id,
                                  action,
                                  reason,
                                  moderator,
                                  muteDuration,
                              }) => ({
                                  name: `${action.toUpperCase()} | Case #${id}`,
                                  value: `Moderator: <@${moderator}>\n${
                                      reason ?? 'No reason provided'
                                  }${
                                      (muteDuration &&
                                          `\n**Mute Duration:** ${parseMsIntoReadableText(
                                              muteDuration
                                          )}`) ||
                                      ''
                                  }`,
                              })
                          )
                  )
          )
        : [
              new MessageEmbed()
                  .setAuthor({
                      name: `${
                          targetMember?.displayName ?? target.username
                      }'s ${type !== 'all' ? capitalize(type) : 'Mod'} Log`,
                      iconURL: target.displayAvatarURL({ dynamic: true }),
                  })
                  .setDescription(
                      `No ${type !== 'all' ? type : ''} logs found.`
                  ),
          ];
    const { components, collectorHandler } = getPaginationComponents(
        Math.ceil(cases.length / 5)
    );

    const sentMessage = await interaction.reply({
        embeds: [embeds[0]],
        components,
        fetchReply: true,
    });
    collectorHandler(sentMessage, user, embeds);
}

export async function writeModLog(
    target: User,
    reason: string | null,
    moderator: User,
    action: ModLog['action'],
    muteDuration?: number
): Promise<void> {
    const logChannel = getCommunityDiscord(moderator.client).channels.cache.get(
        channelIds['public-mod-log']
    );

    const cases = cacheData['discord_bot/community/modlog'];
    const sortedCases = cases.sort((a, b) => a.case - b.case);

    const newCase = {
        case: sortedCases.length
            ? sortedCases[sortedCases.length - 1].case + 1
            : 1,
        moderator: moderator.id,
        offender: target.id,
        action,
        timestamp: Date.now(),
        reason,
        muteDuration,
    };

    await database.ref(`discord_bot/community/modlog`).set([...cases, newCase]);

    if (logChannel?.isText()) {
        let color: ColorResolvable;
        switch (action) {
            case 'ban':
                color = '#ff1919';
                break;
            case 'unban':
                color = '#66ff66';
                break;
            case 'kick':
                color = '#ff7f7f';
                break;
            case 'mute':
                color = '#ff7519';
                break;
            case 'unmute':
                color = '#e5ffe5';
                break;
            case 'warn':
                color = '#ffe34c';
                break;
            default:
                color = '#ffffff';
        }
        let embed = new MessageEmbed()
            .setTitle(action.toUpperCase())
            .setAuthor({ name: `Case ${newCase.case}` })
            .setDescription(reason ?? 'No reason provided.')
            .addField('Offender', `${target.tag} ${target}`)
            .setColor(color)
            .setTimestamp(newCase.timestamp);

        if (action === 'mute' && muteDuration)
            embed = embed.addField(
                'Mute Duration',
                parseMsIntoReadableText(muteDuration, true)
            );
        embed = embed.addField('Moderator', `${moderator.tag} ${moderator}`);
        await logChannel.send({
            embeds: [embed],
        });
    }
}

export async function getModdingEntryFromAuditLog<
    TEntryAction extends keyof Pick<
        GuildAuditLogsActions,
        'MEMBER_BAN_ADD' | 'MEMBER_BAN_REMOVE' | 'MEMBER_KICK' | 'MEMBER_UPDATE'
    >
>(
    member: GuildBan | GuildMember | PartialGuildMember,
    type: TEntryAction
): Promise<GuildAuditLogsEntry<
    TEntryAction,
    TEntryAction,
    'DELETE',
    'USER'
> | null> {
    const {
        client: { user: clientUser },
        guild,
        user,
    } = member;
    const auditLogs = await guild.fetchAuditLogs({
        type,
        limit: 1,
    });

    const entry = auditLogs.entries.find(
        ({ target, executor, createdTimestamp }) =>
            target === user &&
            !!clientUser &&
            executor !== clientUser &&
            Date.now() - createdTimestamp < 1000 * 60
    );

    if (entry && entry.executor) {
        return entry as GuildAuditLogsEntry<
            TEntryAction,
            TEntryAction,
            'DELETE',
            'USER'
        >;
    }
    return null;
}

export const writeModLogOnGenericBan = async (
    banObject: GuildBan
): Promise<void> => {
    const entry = await getModdingEntryFromAuditLog(
        banObject,
        'MEMBER_BAN_ADD'
    );
    if (entry && entry.target && entry.executor)
        await writeModLog(entry.target, entry.reason, entry.executor, 'ban');
};

export const writeModLogOnGenericUnban = async (
    banObject: GuildBan
): Promise<void> => {
    const entry = await getModdingEntryFromAuditLog(
        banObject,
        'MEMBER_BAN_REMOVE'
    );
    if (entry && entry.target && entry.executor)
        await writeModLog(entry.target, entry.reason, entry.executor, 'unban');
};

export const writeModLogOnGenericKick = async (
    member: GuildMember | PartialGuildMember
): Promise<void> => {
    const entry = await getModdingEntryFromAuditLog(member, 'MEMBER_KICK');
    if (entry && entry.executor)
        await writeModLog(member.user, entry.reason, entry.executor, 'kick');
};

export const writeModLogOnGenericMute = async (
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember | PartialGuildMember
): Promise<void> => {
    if (
        (oldMember.communicationDisabledUntil === null &&
            newMember.communicationDisabledUntil !== null) ||
        (oldMember.communicationDisabledUntil !== null &&
            newMember.communicationDisabledUntil === null)
    ) {
        const entry = await getModdingEntryFromAuditLog(
            oldMember,
            'MEMBER_UPDATE'
        );

        if (entry && entry.executor) {
            await writeModLog(
                newMember.user,
                entry.reason,
                entry.executor,
                newMember.communicationDisabledUntil === null
                    ? 'unmute'
                    : 'mute'
            );
        }
    }
};

export const commandData: ApplicationCommandData[] = [
    {
        name: 'modlog',
        description: 'View the mod log.',
        defaultPermission: false,
        options: [
            {
                name: 'inspect',
                description: 'Inspect the mod log of a member.',
                type: 'SUB_COMMAND',
                options: [
                    {
                        name: 'member',
                        description: 'The member to view the mod log for.',
                        type: 'USER',
                        required: true,
                    },
                    {
                        name: 'log-type',
                        description: 'The type of log to view.',
                        type: 'STRING',
                        choices: [
                            {
                                name: 'Everything',
                                value: 'all',
                            },
                            {
                                name: 'Bans',
                                value: 'bans',
                            },
                            {
                                name: 'Mutes',
                                value: 'mutes',
                            },
                            {
                                name: 'Warnings',
                                value: 'warnings',
                            },
                            {
                                name: 'Kicks',
                                value: 'kicks',
                            },
                        ],
                    },
                ],
            },
            {
                name: 'remove',
                description: 'Remove a mod log entry.',
                type: 'SUB_COMMAND',
                options: [
                    {
                        name: 'case',
                        description: 'The case number of the entry to remove.',
                        type: 'INTEGER',
                        minValue: 1,
                        required: true,
                    },
                ],
            },
            {
                name: 'edit-reason',
                description: 'Edit the reason for a mod log entry.',
                type: 'SUB_COMMAND',
                options: [
                    {
                        name: 'case',
                        description: 'The case number of the entry to edit.',
                        type: 'INTEGER',
                        minValue: 1,
                        required: true,
                    },
                    {
                        name: 'reason',
                        description: 'The new reason for the entry.',
                        type: 'STRING',
                        required: true,
                        autocomplete: true,
                    },
                ],
            },
        ],
    },
];
