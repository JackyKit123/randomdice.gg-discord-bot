import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import { GuildMember, Message } from 'discord.js';
import { database } from 'register/firebase';
import { suppressReactionBlocked } from 'util/suppressErrors';
import { getBalance } from './balance';

const rapidSuccessJoin = new Map<GuildMember, number>();

export default async function welcomeReward(
    member: GuildMember
): Promise<void> {
    const general = member.guild.channels.cache.get(channelIds.general);
    const now = Date.now().valueOf();

    if (
        !general?.isText() ||
        now - (rapidSuccessJoin.get(member) || 0) <= 1000 * 60 * 60
    ) {
        return;
    }
    rapidSuccessJoin.set(member, now);

    const saidWelcome: (string | undefined)[] = [member.id];
    general
        .createMessageCollector({
            filter: (collected: Message) =>
                !collected.author.bot && /welcome/i.test(collected.content),
            time: 60 * 1000,
        })
        .on('collect', async (collected: Message) => {
            const id = collected.member?.id;
            if (!id || saidWelcome.includes(id)) return;
            saidWelcome.push(id);
            const balance = await getBalance(collected, true);
            if (balance === null) return;
            // the first person to welcome gets 250 and then it decreases by 50 until it hits the floor of 100
            const reward = Math.max(100, 250 - 50 * (saidWelcome.length - 1));
            await database
                .ref(`discord_bot/community/currency/${id}/balance`)
                .set(balance + reward);
            await collected.react(coinDice).catch(suppressReactionBlocked);
        });
}
