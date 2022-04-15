import { Guild, GuildBan, MessageEmbed, User } from 'discord.js';
import {
    suppressMissingPermission,
    suppressUnknownBan,
    suppressUnknownMember,
} from 'util/suppressErrors';
import { getRegisteredChannels } from '.';
import { getHackBanLogButtonsComponent } from './hackbanButton';

export async function broadcastHackBan(
    guild: Guild,
    offender: User,
    moderator: User | null,
    reason: string
): Promise<void> {
    const registeredChannels = await getRegisteredChannels(offender.client);

    await Promise.all(
        [...registeredChannels.values()].map(async channel => {
            const {
                guild: { members, me: bot, bans, id },
            } = channel;
            if (id === guild.id) return;

            const offenderIsMemberOfGuild =
                members.cache.has(offender.id) ||
                !!(await members.fetch(offender).catch(suppressUnknownMember));

            let offenderIsBanned: 'Unknown' | boolean;
            if (offenderIsMemberOfGuild) {
                offenderIsBanned = false;
            } else if (!bot?.permissions.has('BAN_MEMBERS')) {
                offenderIsBanned = 'Unknown';
            } else {
                offenderIsBanned =
                    bans.cache.has(offender.id) ||
                    !!(await bans
                        .fetch(offender)
                        .catch(suppressUnknownBan)
                        .catch(suppressMissingPermission));
            }

            const embed = new MessageEmbed()
                .setAuthor({
                    name: `Ban in ${guild.name}`,
                    iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
                })
                .setColor(offenderIsBanned ? 0 : '#fe6862')
                .setTitle('Hack Ban Log')
                .setThumbnail(offender.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `${offender.tag} has been banned from ${guild.name}`
                )
                .addField('Ban Reason', reason)
                .addField(
                    'Offender is Member in This Server',
                    offenderIsMemberOfGuild ? '✅' : '❌'
                )
                .addField(
                    'Offender is Banned in This Server',
                    offenderIsBanned === 'Unknown'
                        ? 'Unknown ❔ I need `BAN_MEMBERS` Permission to check if the user is banned'
                        : (offenderIsBanned && '✅') || '❌'
                )
                .addField(
                    'Moderator',
                    moderator ? `${moderator.tag} ${moderator}` : 'Unknown'
                )
                .setFooter({ text: `User ID: ${offender.id}` })
                .setTimestamp();

            await channel.send({
                content: `${offender} has been banned from ${guild.name}`,
                embeds: [embed],
                components: getHackBanLogButtonsComponent(
                    offenderIsMemberOfGuild,
                    offenderIsBanned
                ),
            });
        })
    );
}

export default async function broadcastBanLogOnBan(
    ban: GuildBan
): Promise<void> {
    const { guild, client, user } = ban;
    const { user: clientUser } = client;
    const registeredChannels = await getRegisteredChannels(client);
    if (!registeredChannels.has(guild) || !clientUser) return;

    const entry = (
        await guild.fetchAuditLogs({
            type: 'MEMBER_BAN_ADD',
            limit: 3,
        })
    ).entries.find(
        ({ target, createdTimestamp, executor }) =>
            executor !== clientUser &&
            target === user &&
            Date.now() - createdTimestamp < 60 * 1000
    );
    if (!entry) return;
    const { reason, executor } = entry;
    if (!reason?.toLowerCase().includes('hack')) return;

    await broadcastHackBan(guild, user, executor, reason);
}
