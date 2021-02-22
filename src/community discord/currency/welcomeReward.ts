import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import getBalance from './balance';

export default async function welcomeReward(
    message: Discord.Message
): Promise<void> {
    const { guild, embeds, channel } = message;
    const app = firebase.app();
    const database = app.database();

    if (!guild || channel.id !== '804235804506324992' /* #join-leave-log */)
        return;
    if (!embeds.some(embed => embed.title === 'Member joined')) return;

    const general = guild.channels.cache.get('804222694488932364') as
        | Discord.TextChannel
        | undefined;
    if (general?.type !== 'text') return;
    const collector = general.createMessageCollector(
        (collected: Discord.Message) =>
            !collected.author.bot && /welcome/i.test(collected.content),
        { time: 60 * 1000 }
    );
    const saidWelcome = [] as string[];
    collector.on('collect', async (collected: Discord.Message) => {
        const { id } = collected.member as Discord.GuildMember;
        if (saidWelcome.includes(id)) return;
        saidWelcome.push(id);
        const balance = await getBalance(
            message,
            'silence',
            collected.member as Discord.GuildMember
        );
        if (balance === false) return;
        await database
            .ref(`discord_bot/community/currency/${id}/balance`)
            .set(balance + 100);
    });
}
