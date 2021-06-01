import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import getBalance from './balance';
import cache from '../../util/cache';

export function duplicatedRoleMulti(member: Discord.GuildMember): number {
    const tier1roles = [
        '804512584375599154',
        '805817350241779712',
        '806312627877838878',
        '804231753535193119',
    ];
    const tier2roles = [
        '804513079319592980',
        '805817742081916988',
        '806896328255733780',
        '804496339794264085',
        '805388604791586826',
    ];
    const tier3roles = [
        '804513117228367882',
        '805817760353091606',
        '809142956715671572',
    ];
    const tier4roles = [
        '805727466219372546',
        '805817776232202318',
        '809143588105486346',
    ];

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
        duplicatedTierMulti(tier1roles, 2) +
        duplicatedTierMulti(tier2roles, 5) +
        duplicatedTierMulti(tier3roles, 10) +
        duplicatedTierMulti(tier4roles, 20)
    );
}

const cooldown = new Map<string, number>();
export default async function chatCoins(
    message: Discord.Message,
    dd?: true
): Promise<void> {
    const database = firebase.app().database();
    const { content, member, channel, author } = message;

    if (
        author.id === '723917706641801316' &&
        channel.id === '804222694488932364' &&
        content === '<@&807578981003689984> come and revive this dead chat.'
    ) {
        let generalMulti =
            cache['discord_bot/community/currencyConfig'].multiplier.channels[
                '804222694488932364'
            ] || 0;
        await database
            .ref(
                `discord_bot/community/currencyConfig/multiplier/channels/804222694488932364`
            )
            .set(generalMulti + 10);
        setTimeout(async () => {
            generalMulti =
                cache['discord_bot/community/currencyConfig'].multiplier
                    .channels['804222694488932364'] || 0;
            await database
                .ref(
                    `discord_bot/community/currencyConfig/multiplier/channels/804222694488932364`
                )
                .set(generalMulti - 10);
        }, 60 * 60 * 1000);
        await channel.send(
            `For the next 60 minutes, ${channel} has extra \`x10\` multiplier!`
        );
        return;
    }

    if (
        author.bot ||
        !member ||
        content.startsWith('!') ||
        (/^dd/i.test(content) && !dd)
    ) {
        return;
    }

    const balance = (await getBalance(message, 'silence')) as number;
    if (!Object.keys(cache['discord_bot/community/currency']).length) return;

    const now = Date.now().valueOf();
    const userCooldown = cooldown.get(member.id) || 0;

    if (now - userCooldown <= 10 * 1000) return;
    cooldown.set(member.id, now);
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
    const weekly =
        Number(cache['discord_bot/community/currency'][member.id].weeklyChat) ||
        0;
    await database
        .ref(`discord_bot/community/currency/${member.id}/weeklyChat`)
        .set(weekly + 1);
}
