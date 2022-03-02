import Discord from 'discord.js';
import fetchMentionString from 'util/fetchMention';
import cooldown from 'util/cooldown';
import commandCost from './commandCost';

export default async function bon(message: Discord.Message): Promise<void> {
    const { content, channel, guild, author } = message;

    if (
        !guild ||
        (await cooldown(message, '!bon', {
            default: 60 * 1000,
            donator: 30 * 1000,
        }))
    )
        return;

    const memberArg = content.split(' ')[1];
    const target = await fetchMentionString(memberArg, guild);
    const reason = content.split(' ').slice(2).join(' ') || 'no reason';

    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!bon <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }

    if (!(await commandCost(message, 1000))) return;
    const general = guild?.channels.cache.get('804222694488932364');
    await channel.send(`Goodbye ${target}, get fucking bonned!`);
    if (general?.isText())
        await general.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setImage(
                        'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
                    )
                    .setThumbnail(
                        target.displayAvatarURL({
                            dynamic: true,
                        })
                    )
                    .setTitle(
                        `${target.user.username}#${target.user.discriminator} Got bonned`
                    )
                    .setColor('#ff0000')
                    .setDescription(
                        `${target} got bonned by ${author} for ||${reason}||`
                    ),
            ],
        });
}
