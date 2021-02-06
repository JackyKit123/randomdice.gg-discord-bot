import * as Discord from 'discord.js';
import cooldown from '../helper/cooldown';

export default async function eventPing(
    message: Discord.Message
): Promise<void> {
    const { member, channel, content, deletable, guild, reply } = message;

    const [command, ...args] = content.split(' ');

    if (
        command.toLowerCase() !== '!eventping' ||
        !guild ||
        !(
            member?.roles.cache.has('804223928427216926') ||
            member?.roles.cache.has('807219483311603722') ||
            member?.roles.cache.has('805000661133295616') ||
            member?.hasPermission('MENTION_EVERYONE')
        )
    ) {
        return;
    }

    if (
        await cooldown(message, '!eventping', {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }

    let embed = new Discord.MessageEmbed()
        .setAuthor(
            'Event Time WOO HOO!!!',
            guild.iconURL({
                dynamic: true,
            }) ?? undefined
        )
        .setColor(member.displayHexColor)
        .setFooter('Enjoy the event!')
        .addField('Hosted by', member);

    if (args) {
        if (args.join(' ').length > 1024) {
            await reply('Event detail cannot be longer than 1024 characters.');
            return;
        }
        embed = embed.addField('Event Detail', args.join(' '));
    }

    if (deletable) await message.delete();
    await channel.send('<@&804544088153391124>', embed);
}
