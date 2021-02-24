import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import getBalance from './balance';
import cache from '../../helper/cache';

const cooldown = new Map<string, number>();
export default async function chatCoins(
    message: Discord.Message,
    dd?: true
): Promise<void> {
    const database = firebase.app().database();
    const { content, member, channel } = message;

    if (!member || content.startsWith('!') || (/^dd/i.test(content) && !dd)) {
        return;
    }

    const balance = (await getBalance(message, 'silence')) || 10000;

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
        cache['discord_bot/community/currency'][member.id].weeklyChat || 0;
    await database
        .ref(`discord_bot/community/currency/${member.id}/weeklyChat`)
        .set(weekly + 1);
}
