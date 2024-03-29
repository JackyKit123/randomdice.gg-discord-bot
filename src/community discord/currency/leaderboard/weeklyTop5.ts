import { deleteCustomRole } from 'community discord/customRole';
import checkPermission from 'community discord/util/checkPermissions';
import channelIds from 'config/channelIds';
import { getCoinDiceEmoji } from 'config/emojiId';
import { getCommunityDiscord } from 'config/guild';
import roleIds, { tier2RoleIds } from 'config/roleId';
import { communityDiscordInvitePermaLink } from 'config/url';
import {
    Client,
    CommandInteraction,
    GuildMember,
    MessageEmbed,
} from 'discord.js';
import moment from 'moment';
import { database } from 'register/firebase';
import cache from 'util/cache';
import logMessage from 'util/logMessage';
import { suppressUnknownMember } from 'util/suppressErrors';
import wait from 'util/wait';
import { sortLeaderboard } from '.';

export async function resetWeeklyTop5(
    input: Client<true> | CommandInteraction<'cached'>
): Promise<void> {
    if (
        input instanceof CommandInteraction &&
        !(await checkPermission(input, roleIds.Admin))
    )
        return;

    if (input instanceof Client)
        await wait(
            moment()
                .utc()
                .add(1, 'week')
                .startOf('week')
                .diff(moment())
                .valueOf()
        );

    const client = input instanceof Client ? input : input.client;
    const guild = getCommunityDiscord(client);
    const channel = guild.channels.cache.get(channelIds['weekly-top-5']);

    if (!channel?.isText()) {
        await logMessage(
            client,
            'warning',
            'Unable to get text channel weekly-top-5 when resetting weekly.'
        );
        return;
    }

    const prevWeeklyTop5Ids = new Set(
        cache['discord_bot/community/currencyConfig'].weeklyWinners
    );
    const currencyList = cache['discord_bot/community/currency'];

    const sortedWeekly = sortLeaderboard('weekly', 'raw');
    const embedFields = sortLeaderboard('weekly', 'embed');

    await channel.send({
        content: `<@&${roleIds['Weekly Top 5']}>`,
        embeds: [
            new MessageEmbed()
                .setColor('#6ba4a5')
                .setThumbnail(getCoinDiceEmoji(client)?.url ?? '')
                .setTitle(`Top 5 Weekly Winners`)
                .setAuthor({
                    name: 'Randomdice.gg Server',
                    iconURL:
                        guild.iconURL({
                            dynamic: true,
                        }) ?? undefined,
                    url: communityDiscordInvitePermaLink,
                })
                .addFields(embedFields.slice(0, 5)),
        ],
    });

    Object.keys(currencyList).forEach(id =>
        database.ref(`discord_bot/community/currency/${id}/weeklyChat`).set(0)
    );
    guild.roles.cache
        .get(roleIds['Weekly Top 5'])
        ?.members.forEach(member => prevWeeklyTop5Ids.add(member.id));

    await Promise.all(
        [...prevWeeklyTop5Ids].map(async uid => {
            const member =
                guild.members.cache.get(uid) ??
                (await guild.members.fetch(uid).catch(suppressUnknownMember));
            if (member?.roles.cache.has(roleIds['Weekly Top 5'])) {
                await member.roles.remove(roleIds['Weekly Top 5']);
            } else {
                prevWeeklyTop5Ids.delete(uid);
            }
        })
    );
    await channel.send(
        `Removed <@&${roleIds['Weekly Top 5']}> from ${[...prevWeeklyTop5Ids]
            .map(uid => `<@${uid}>`)
            .join(' ')}`
    );

    const newWeeklyTop5Ids = Object.keys(sortedWeekly).slice(0, 5);
    await channel.send(
        `Added <@&${roleIds['Weekly Top 5']}> to ${(
            await Promise.all(
                newWeeklyTop5Ids.map(
                    async uid =>
                        (
                            await guild.members
                                .fetch(uid)
                                .catch(suppressUnknownMember)
                        )?.roles.add(roleIds['Weekly Top 5']) ?? ''
                )
            )
        ).join(' ')}`
    );

    await database
        .ref('/discord_bot/community/currencyConfig/weeklyWinners')
        .set(newWeeklyTop5Ids);
    // remove customRoles if no tier2 perks
    await Promise.all(
        [...prevWeeklyTop5Ids].map(async uid => {
            const m = guild.members.cache.get(uid);
            if (m && !m.roles.cache.hasAny(...tier2RoleIds)) {
                await deleteCustomRole(
                    guild,
                    m.id,
                    `${m.user.tag} lost weekly top 5 role and does not have another tier 2 perk`
                );
            }
        })
    );

    if (input instanceof CommandInteraction) {
        await input.reply('Weekly leaderboard has been reset.');
    }
}

export async function validateMemberWeeklyTop5RoleStatus(
    member: GuildMember
): Promise<void> {
    const weeklyTop5Ids =
        cache['discord_bot/community/currencyConfig'].weeklyWinners;
    const memberIsInWeeklyTop5 = weeklyTop5Ids.includes(member.id);
    const memberHasWeeklyTop5Role = member.roles.cache.has(
        roleIds['Weekly Top 5']
    );

    if (memberIsInWeeklyTop5 && !memberHasWeeklyTop5Role) {
        await member.roles.add(roleIds['Weekly Top 5']);
    } else if (!memberIsInWeeklyTop5 && memberHasWeeklyTop5Role) {
        await member.roles.remove(roleIds['Weekly Top 5']);
    }
}
