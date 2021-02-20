import * as Discord from 'discord.js';

const timeoutStore = new Map<string, NodeJS.Timeout>();

export default async function welcomeReward(
    message: Discord.Message
): Promise<void> {
    const { guild, embeds, channel } = message;

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
    collector.on('collect', (collected: Discord.Message) => {
        const { roles, id } = collected.member as Discord.GuildMember;
        if (saidWelcome.includes(id)) return;
        saidWelcome.push(id);
        const memberTimeout = timeoutStore.get(id);
        if (memberTimeout) clearTimeout(memberTimeout);
        roles.add('812692808318189649', 'Welcome Reward');
        timeoutStore.set(
            id,
            setTimeout(
                () => roles.remove('812692808318189649', 'Welcome Reward ends'),
                60 * 1000
            )
        );
    });
}
