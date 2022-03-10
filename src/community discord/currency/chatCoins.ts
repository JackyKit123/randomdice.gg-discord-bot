import channelIds from 'config/channelIds';
import roleIds, {
    tier1RoleIds,
    tier2RoleIds,
    tier3RoleIds,
    tier4RoleIds,
    tier5RoleIds,
} from 'config/roleId';
import Discord from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import { getBalance } from './balance';

export function duplicatedRoleMulti(member: Discord.GuildMember): number {
    const duplicatedTierMulti = (
        tierRoles: string[],
        multiplier: number
    ): number =>
        Math.max(
            (member.roles.cache.filter(role => tierRoles.includes(role.id))
                .size -
                1) *
                multiplier,
            0
        );

    return (
        duplicatedTierMulti(tier1RoleIds, 2) +
        duplicatedTierMulti(tier2RoleIds, 5) +
        duplicatedTierMulti(tier3RoleIds, 10) +
        duplicatedTierMulti(tier4RoleIds, 20) +
        duplicatedTierMulti(tier5RoleIds, 50)
    );
}

const cooldown = new Map<string, boolean>();
const weeklyCooldown = new Map<string, boolean>();
export default async function chatCoins(
    message: Discord.Message,
    dd?: true
): Promise<void> {
    const { content, member, channel, author, client } = message;

    if (
        client.user &&
        author.id === client.user.id &&
        channel.id === channelIds.general &&
        content ===
            `<@&${roleIds['Chat Revive Ping']}> come and revive this dead chat.`
    ) {
        let generalMulti =
            cache['discord_bot/community/currencyConfig'].multiplier.channels[
                channelIds.general
            ] || 0;
        await database
            .ref(
                `discord_bot/community/currencyConfig/multiplier/channels/${channelIds.general}`
            )
            .set(generalMulti + 10);
        setTimeout(async () => {
            generalMulti =
                cache['discord_bot/community/currencyConfig'].multiplier
                    .channels[channelIds.general] || 0;
            await database
                .ref(
                    `discord_bot/community/currencyConfig/multiplier/channels/${channelIds.general}`
                )
                .set(generalMulti - 10);
        }, 60 * 60 * 1000);
        await channel.send(
            `For the next 60 minutes, ${channel} has extra \`x10\` multiplier!`
        );
        return;
    }

    if (
        channel.type === 'DM' ||
        author.bot ||
        !member ||
        content.startsWith('!') ||
        (/^dd/i.test(content) && !dd)
    ) {
        return;
    }

    const balance = await getBalance(message, true);
    if (
        balance === null ||
        !Object.keys(cache['discord_bot/community/currency']).length
    )
        return;

    if (cooldown.get(member.id)) return;
    cooldown.set(member.id, true);
    setTimeout(() => cooldown.set(member.id, false), 10 * 1000);
    let reward = 1;

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    reward += multiplier.channels[channel.id] || 0;
    member.roles.cache.forEach(role => {
        reward += multiplier.roles[role.id] || 0;
    });
    reward += duplicatedRoleMulti(member);
    multiplier.blacklisted.forEach(blacklisted => {
        if (blacklisted === channel.id || member.roles.cache.has(blacklisted)) {
            reward = 0;
        }
    });
    if (reward === 0) return;

    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + reward);
    if (weeklyCooldown.get(member.id)) return;
    const weekly =
        Number(cache['discord_bot/community/currency'][member.id].weeklyChat) ||
        0;
    await database
        .ref(`discord_bot/community/currency/${member.id}/weeklyChat`)
        .set(weekly + 1);
    setTimeout(
        () => weeklyCooldown.set(member.id, false),
        (channel.parentId === channelIds['🤖 | Bot Channels'] ? 30 : 10) * 1000
    );
}
