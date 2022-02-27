import Discord from 'discord.js';
import { database } from 'firebase';
import getBalance from 'util/getBalance';

const rapidSuccessJoin = new Map<string | undefined, number>();

export default async function welcomeReward(
    message: Discord.Message
): Promise<void> {
    const { guild, embeds, channel } = message;

    if (!guild || channel.id !== '845448948474576946' /* #join-leave-log */)
        return;
    if (!embeds.some(embed => embed.title === 'Member joined')) return;
    const joinedMember = embeds[0]?.description
        ?.split(' ')?.[0]
        ?.replace(/^<@!?/, '')
        .replace(/>$/, '');
    const now = Date.now().valueOf();
    if (now - (rapidSuccessJoin.get(joinedMember) || 0) <= 1000 * 60 * 60) {
        return;
    }
    rapidSuccessJoin.set(joinedMember, now);

    const general = guild.channels.cache.get('804222694488932364') as
        | Discord.TextChannel
        | undefined;
    if (general?.type !== 'GUILD_TEXT') return;
    const saidWelcome: (string | undefined)[] = [joinedMember];
    general
        .createMessageCollector({
            filter: (collected: Discord.Message) =>
                !collected.author.bot && /welcome/i.test(collected.content),
            time: 60 * 1000,
        })
        .on('collect', async (collected: Discord.Message) => {
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
