import { banHammer } from 'config/emojiId';
import { isCommunityDiscord } from 'config/guild';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    GuildBan,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { database } from 'register/firebase';
import cacheData from 'util/cache';
import disableButtons from 'util/disabledButtons';
import { suppressUnknownBan, suppressUnknownUser } from 'util/suppressErrors';
import { writeModLog } from './modlog';
import Reasons from './reasons.json';
import { checkModActionValidity, startHackWarnTimer, dmOffender } from './util';

export async function participate(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const {
        guild,
        options,
        member,
        client: { user: clientUser },
    } = interaction;
    if (!clientUser) return;
    const isJoining = options.getSubcommand(true) === 'participate';
    const existingParticipation =
        cacheData['discord_bot/registry'][guild.id]?.hacklog;

    if (guild.memberCount < 200 && isJoining) {
        await interaction.reply(
            'Your server must have at least 200 members to participate in the hackban system.'
        );
        return;
    }

    if (!member.permissions.has('MANAGE_GUILD')) {
        await interaction.reply(
            'You lack permission to execute this command, required permission: `MANAGE_GUILD`'
        );
        return;
    }

    let channel = null;
    if (isJoining) {
        channel = options.getChannel('log-channel', true);
        if (!channel.isText()) {
            await interaction.reply(
                'You must provide a text channel for the log channel'
            );
            return;
        }
        if (!channel.permissionsFor(clientUser)?.has('SEND_MESSAGES')) {
            await interaction.reply(
                'I lack permission to send messages in this channel, please give me permission to send messages in that channel and try again.'
            );
            return;
        }
    }

    await database
        .ref('discord_bot/registry')
        .child(guild.id)
        .child('hacklog')
        .set((isJoining && options.getChannel('log-channel')?.id) || null);

    await interaction.reply(
        `Your server has successfully ${
            isJoining ? 'joined' : 'left'
        } the hack log sharing.`
    );

    if (isJoining) {
        if (!existingParticipation) {
            await interaction.followUp(
                'By participating in the hack log, your server ban action will be shared with other participated servers if the keyword "hack" exist in the ban reason. If you wish to exit this, do `/hackban-log unparticipate`'
            );
        }
    }
}

export async function broadcastBanLogOnBan(ban: GuildBan): Promise<void> {
    const {
        guild,
        client: { guilds, user: clientUser },
        user,
    } = ban;
    const hacklog = cacheData['discord_bot/registry'][guild.id]?.hacklog;
    const { reason } = await ban.fetch();
    if (!hacklog || !reason?.toLowerCase().includes('hack') || !clientUser)
        return;

    await Promise.all(
        Object.entries(cacheData['discord_bot/registry']).map(
            async ([guildId, registry]) => {
                if (!registry.hacklog || guildId === guild.id) return;
                const registeredGuild = guilds.cache.get(guildId);
                const channel = guilds.cache
                    .get(guildId)
                    ?.channels.cache.get(registry.hacklog);
                if (
                    !registeredGuild ||
                    !channel?.isText() ||
                    !channel.permissionsFor(clientUser)?.has('SEND_MESSAGES')
                ) {
                    await database
                        .ref('discord_bot/registry')
                        .child(guild.id)
                        .child('hacklog')
                        .set(null);
                    return;
                }
                const offenderIsBanned = await registeredGuild.bans
                    .fetch(ban.user)
                    .catch(suppressUnknownBan);
                const embed = new MessageEmbed()
                    .setAuthor({
                        name: `Ban in ${guild.name}`,
                        iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
                    })
                    .setColor(offenderIsBanned ? 0 : '#fe6862')
                    .setTitle('Hack Ban Log')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription(
                        `${user.tag} has been banned from ${guild.name}`
                    )
                    .addField('Ban Reason', reason)
                    .setFooter({ text: `User ID: ${user.id}` })
                    .setTimestamp();
                const component = new MessageActionRow().setComponents([
                    new MessageButton()
                        .setCustomId('hackban-log-warn')
                        .setLabel('Warn')
                        .setStyle('PRIMARY')
                        .setEmoji('⚠️'),
                    new MessageButton()
                        .setCustomId('hackban-log-ban')
                        .setLabel('Ban')
                        .setStyle('DANGER')
                        .setEmoji(banHammer),
                ]);
                await channel.send({
                    embeds: [embed],
                    components: offenderIsBanned ? [] : [component],
                });
            }
        )
    );
}

export async function banLogButtons(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    const {
        channel,
        guild,
        member: moderator,
        customId,
        client: { user: clientUser },
        message,
    } = interaction;
    const { members, client } = guild;
    const { embeds, components } = message;
    if (!clientUser) return;
    const isBan = customId === 'hackban-log-ban';
    const isWarn = customId === 'hackban-log-warn';
    const action = ((isBan && 'ban') || (isWarn && 'warn')) as 'ban' | 'warn';

    const offenderId =
        embeds[0]?.footer?.text.match(/^User ID: (\d{18})$/)?.[1];
    if (!offenderId) {
        await interaction.reply({
            content:
                'I could not find the user ID in the footer, please contact the bot developer.',
            ephemeral: true,
        });
        return;
    }

    const offenderMember = members.cache.get(offenderId);

    if (await checkModActionValidity(interaction, offenderId, action)) return;

    const reason = ((isBan && Reasons['Member in Hack Servers']) ||
        (isWarn && Reasons['Warn to Leave Hack Servers'])) as string;

    const offender = await client.users
        .fetch(offenderId)
        .catch(suppressUnknownUser);

    if (!offender) {
        await interaction.reply({
            content:
                'I could not find the user, please contact the bot developer.',
            ephemeral: true,
        });
        return;
    }

    await dmOffender(offender, moderator, action, reason, null);

    if (isCommunityDiscord(guild)) {
        await writeModLog(offender, reason, moderator.user, action, null);
    }

    if (isBan)
        await members.ban(offenderId, {
            reason,
        });

    await interaction.reply(
        `${offender} has been ${(isBan && 'banned') || (isWarn && 'warned')}.`
    );

    if (isWarn) await startHackWarnTimer(moderator, offenderMember, channel);

    message.edit(
        disableButtons({
            embeds,
            components,
        })
    );
}

export async function warnOnBannedMemberJoin(
    member: GuildMember
): Promise<void> {
    const {
        guild,
        client: { guilds, user: clientUser },
    } = member;
    const hacklog = cacheData['discord_bot/registry'][guild.id]?.hacklog;
    if (!hacklog || !clientUser) return;

    await Promise.all(
        Object.entries(cacheData['discord_bot/registry']).map(
            async ([guildId, registry]) => {
                if (!registry.hacklog || guildId === guild.id) return;
                const registeredGuild = guilds.cache.get(guildId);
                const channel = guilds.cache
                    .get(guildId)
                    ?.channels.cache.get(registry.hacklog);
                if (
                    !registeredGuild ||
                    !channel?.isText() ||
                    !channel.permissionsFor(clientUser)?.has('SEND_MESSAGES')
                ) {
                    await database
                        .ref('discord_bot/registry')
                        .child(guild.id)
                        .child('hacklog')
                        .set(null);
                    return;
                }
                const messages =
                    channel.messages.cache.size >= 100
                        ? channel.messages.cache
                        : await channel.messages.fetch({ limit: 100 });

                const appearedLogs = new Set(
                    messages.reduce(
                        (appearedLogMessage: Message[], message) => {
                            if (
                                message.embeds[0]?.footer?.text.match(
                                    /^User ID: (\d{18})$/
                                )?.[1] === member.id
                            ) {
                                return [...appearedLogMessage, message];
                            }
                            return appearedLogMessage;
                        }
                    )
                ).values();

                await Promise.all(
                    [...appearedLogs].map(async message =>
                        message.reply(
                            `${member} who just joined has appeared in a ban log.`
                        )
                    )
                );
            }
        )
    );
}

export const commandData: ApplicationCommandData = {
    name: 'hackban-log',
    description: 'Participate in the hackban log',
    options: [
        {
            name: 'participate',
            description: 'Participate in the hackban log',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'log-channel',
                    description: 'The channel to log to',
                    required: true,
                    type: 'CHANNEL',
                    channelTypes: ['GUILD_TEXT'],
                },
            ],
        },
        {
            name: 'unparticipate',
            description: 'Unparticipate in the hackban log',
            type: 'SUB_COMMAND',
        },
    ],
};
