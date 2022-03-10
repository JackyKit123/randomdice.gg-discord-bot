import channelIds from 'config/channelIds';
import { GuildBan, MessageEmbed } from 'discord.js';

export default async function banMessage(ban: GuildBan): Promise<void> {
    const { guild, user, reason } = ban;
    const general = guild?.channels.cache.get(channelIds.general);

    if (!general?.isText()) return;
    await general.send({
        embeds: [
            new MessageEmbed()
                .setImage(
                    'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTitle(`${user.tag} Got banned`)
                .setColor('#ff0000')
                .setDescription(
                    `${user} got banned for ||${
                        reason?.replace(
                            '\nFeel free to [appeal here](https://discord.gg/yJBdSRZJmS) if you found this ban to be unjustified.',
                            ''
                        ) ?? 'no reason'
                    }||`
                ),
        ],
    });
}
