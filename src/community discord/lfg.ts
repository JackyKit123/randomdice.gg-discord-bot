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
            member.hasPermission('MENTION_EVERYONE')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Unable to cast command')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&804513079319592980> <@&804496339794264085> <@&805817742081916988>'
                )
        );
        return;
    }

    if (channel.id !== '804224162364129320') {
        await channel.send(
            'You can only use this command in <#804224162364129320>'
        );
        return;
    }

    let embed = new Discord.MessageEmbed()
        .setTitle('Game Time!')
        .setAuthor(
            `${member.user.username}#${member.user.discriminator}`,
            member.user.displayAvatarURL({
                dynamic: true,
            })
        )
        .setColor(member.displayHexColor)
        .addField('Ping / DM', member);

    if (args.join(' ')) {
        if (args.join(' ').length > 1024) {
            await reply('Your message cannot be longer than 1024 characters.');
            return;
        }
        embed = embed.addField('Message', args.join(' '));
    }

    if (deletable) await message.delete();
    await channel.send('<@&805757095232274442>', embed);
}
