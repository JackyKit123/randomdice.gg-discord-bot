import Discord from 'discord.js';
import firebase from 'firebase-admin';
import getBalance from './balance';
import cache from '../../util/cache';

export function duplicatedRoleMulti(member: Discord.GuildMember): number {
    const tier1roles = ['806312627877838878'];
    const tier2roles = [
        '804512584375599154',
        '806896328255733780',
        '804231753535193119',
        '805388604791586826',
    ];
    const tier3roles = ['804513079319592980', '809142956715671572'];
    const tier4roles = ['804513117228367882', '809143588105486346'];

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

const cooldown = new Map<string, boolean>();
const weeklyCooldown = new Map<string, boolean>();
export default async function chatCoins(
    message: Discord.Message,
    dd?: true
): Promise<void> {
    const database = firebase.app().database();
    const { content, member, channel, author, client } = message;

    if (
        author.id === (client.user as Discord.ClientUser).id &&
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
        ((channel as Discord.GuildChannel).parentID === '804227071765118976'
            ? 30
            : 10) * 1000
    );
}

const vcCooldown = new Map<string, boolean>();
export async function voiceChatCoins(
    member: Discord.GuildMember,
    speaking: Readonly<Discord.Speaking>
): Promise<void> {
    const database = firebase.app().database();
    if (member.user.bot || !speaking.bitfield) return;
    if (!Object.keys(cache['discord_bot/community/currency']).length) return;
    const profile = cache['discord_bot/community/currency'][member.id];
    let prestigeLevel = 0;
    const prestigeRoleIds = [
        '806312627877838878',
        '806896328255733780',
        '806896441947324416',
        '809142950117245029',
        '809142956715671572',
        '809142968434950201',
        '809143362938339338',
        '809143374555774997',
        '809143390791925780',
        '809143588105486346',
    ];
    prestigeRoleIds.forEach(id => {
        if (member.roles.cache.has(id)) prestigeLevel += 1;
    });
    let balance = 0;
    if (!profile || !profile.initiated) {
        await database
            .ref(`discord_bot/community/currency/${member.id}/balance`)
            .set(Number(profile?.balance) || 10000);
        await database
            .ref(`discord_bot/community/currency/${member.id}/prestige`)
            .set(prestigeLevel);
        balance = Number(profile?.balance) || 10000;
    } else {
        balance = Number(profile.balance);
    }

    if (vcCooldown.get(member.id)) return;
    vcCooldown.set(member.id, true);
    setTimeout(() => vcCooldown.set(member.id, false), 10 * 1000);
    let reward = 1;

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    member.roles.cache.forEach(role => {
        reward += multiplier.roles[role.id] || 0;
    });
    reward += duplicatedRoleMulti(member);
    if (reward === 0) return;

    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + reward);
}

export async function joinVC(message: Discord.Message): Promise<void> {
    const { member, guild, channel } = message;
    if (!member || !guild) return;
    if (member.voice.channel === null) {
        await channel.send('You are not in a voice channel');
        return;
    }
    await member.voice.channel.join();
    await channel.send(`Joined ${member.voice.channel}`);
}
