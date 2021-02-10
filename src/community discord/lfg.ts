import * as Discord from 'discord.js';
import cooldown from '../helper/cooldown';

export default async function LFG(message: Discord.Message): Promise<void> {
    const { member, channel, content, deletable, reply } = message;

    const [command, ...args] = content.split(' ');

    if (command.toLowerCase() !== '!lfg' || !member) {
        return;
    }

    if (
        await cooldown(message, '!lfg', {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (
        !(
            member.roles.cache.has('804513079319592980') ||
            member.roles.cache.has('804496339794264085') ||
            member.roles.cache.has('805817742081916988') ||
            member.roles.cache.has('806896328255733780') ||
            member.hasPermission('MENTION_EVERYONE')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Unable to cast command')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&804513079319592980> <@&804496339794264085> <@&805817742081916988> <@&806896328255733780>'
                )
        );
        return;
    }

    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${member.user.username}#${member.user.discriminator}`,
            member.user.displayAvatarURL({
                dynamic: true,
            })
        )
        .setColor(member.displayHexColor)
        .addField('Ping / DM', member);

    switch (channel.id) {
        case '804224162364129320': // #lfg
            embed = embed.setTitle(
                `${member.displayName} is looking for a Random Dice partner!`
            );
            break;
        case '806589220000890930': // # bloons-td-6
            embed = embed.setTitle(
                `${member.displayName} is organizing a Bloons TD 6 game!`
            );
            break;
        case '806589343354847302': // #among-us-lfg
            embed = embed.setTitle(
                `${member.displayName} is organizing an Among Us game!`
            );
            break;
        case '806589489068638239': // #catag-lfg
            embed = embed.setTitle(
                `${member.displayName} is organizing a Catan game!`
            );
            break;
        default:
            await channel.send(
                'You can only use this command in <#804224162364129320>, <#806589220000890930>, <#806589343354847302>, <#806589489068638239>'
            );
    }

    if (args.join(' ')) {
        if (args.join(' ').length > 1024) {
            await reply('Your message cannot be longer than 1024 characters.');
            return;
        }
        embed = embed.addField('Message', args.join(' '));
    }

    if (deletable) await message.delete();
    await channel.send(
        channel.id === '804224162364129320'
            ? '<@&805757095232274442>'
            : '@here',
        embed
    );
}
