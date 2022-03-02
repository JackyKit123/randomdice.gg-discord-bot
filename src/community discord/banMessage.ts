import Discord from 'discord.js';
import fetchMention from 'util/fetchMention';

export default async function banMessage(
    message: Discord.Message
): Promise<void> {
    const { client, author, embeds, channel, guild } = message;
    const general = guild?.channels.cache.get('804222694488932364');

    if (
        guild &&
        author.id === '235148962103951360' /* carl-bot */ &&
        channel.id === '804235946807525409' /* #public-mod-log */ &&
        general?.isText()
    ) {
        const embed = embeds[0];
        if (embed && embed.title?.startsWith('ban | case ')) {
            const regexMatch = embed.description?.match(
                /^\*\*Offender:\*\* .+#\d{4}<@!?(\d{18})>\n\*\*Reason:\*\* ((?:.|\n)*)\n\*\*Responsible moderator:\*\* (.+#\d{4})$/
            );
            if (regexMatch) {
                const [, offenderId, reasonString, moderatorName] = regexMatch;
                const user = client.users.cache.get(offenderId);
                const reason = reasonString.match(
                    /^No reason given, use `!reason \d+ <text>` to add one$/
                )
                    ? 'no reason'
                    : reasonString.replace(
                          '\nFeel free to [appeal here](https://discord.gg/yJBdSRZJmS) if you found this ban to be unjustified.',
                          ''
                      );
                const moderator = await fetchMention(moderatorName, guild);
                if (!user) return;
                await general.send({
                    embeds: [
                        new Discord.MessageEmbed()
                            .setImage(
                                'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
                            )
                            .setThumbnail(
                                user.displayAvatarURL({ dynamic: true })
                            )
                            .setTitle(`${user.tag} Got banned`)
                            .setColor('#ff0000')
                            .setDescription(
                                `${user} got banned by ${moderator} for ||${reason}||`
                            ),
                    ],
                });
            }
        }
    }
}
