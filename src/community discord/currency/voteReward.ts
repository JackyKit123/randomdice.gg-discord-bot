import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import { isDSLbot } from 'config/users';
import Discord from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import { getBalance } from './balance';

export default async function voteReward(
    message: Discord.Message
): Promise<void> {
    const { author, channel, embeds, guild } = message;

    if (
        !isDSLbot(author) ||
        channel.id !== channelIds['thank-you-supporters'] ||
        !guild
    )
        return;

    const [embed] = embeds;
    if (!embed) return;

    const uid = embed.description?.match(/\(id:(\d{18})\)/)?.[1];
    if (!uid) return;

    const member = await guild.members.fetch(uid);
    if (!member || !Object.keys(cache['discord_bot/community/currency']).length)
        return;
    const balance = (await getBalance(message, true, member)) || 10000;

    await database
        .ref(`discord_bot/community/currency/${uid}/balance`)
        .set(balance + 1000);
    await channel.send({
        content: `Added ${coinDice} 1000 to ${member}'s balance. Thanks for voting us!`,
        allowedMentions: {
            parse: [],
            users: [],
            roles: [],
        },
    });
}
