import { GuildMember, Message } from 'discord.js';
import { database } from 'register/firebase';
import getBalance from 'util/getBalance';

const rapidSuccessJoin = new Map<GuildMember, number>();

export default async function welcomeReward(
    member: GuildMember
): Promise<void> {
    const general = member.guild.channels.cache.get('804222694488932364');
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
            const balance = await getBalance(collected, 'silence');
            if (balance === false) return;
            await database
                .ref(`discord_bot/community/currency/${id}/balance`)
                .set(balance + 100);
            await collected.react('<:dicecoin:839981846419079178>');
        });
}
