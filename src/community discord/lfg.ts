import Discord from 'discord.js';
import cooldown from '../util/cooldown';

export default async function LFG(message: Discord.Message): Promise<void> {
    const { guild, member, channel, content, deletable, reply } = message;

    const msg = content.replace(/!lfg ?/i, '');

    if (!member || !guild) {
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
            member.roles.cache.has('') ||
            member.roles.cache.has('804496339794264085') ||
            member.roles.cache.has('806896328255733780') ||
            member.roles.cache.has('805388604791586826') ||
            member.hasPermission('MENTION_EVERYONE')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Unable to cast command')
                .setColor('#ff0000')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&805388604791586826> <@&804496339794264085> <@&806896328255733780> <@&805388604791586826>'
                )
        );
        return;
    }

    if (channel.id !== '804224162364129320') {
        await channel.send(
            'You can only use this command in <#804224162364129320>.'
        );
        return;
    }

    if (msg.length > 1024) {
        await reply('Your message cannot be longer than 1024 characters.');
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
        .addField('Ping / DM', member)
        .setTitle(
            `${member.displayName} is looking for a Random Dice partner!`
        );

    if (msg) {
        embed = embed.addField('Message', msg);
    }

    if (deletable) await message.delete();
    await channel.send('<@&805757095232274442>', embed);
}
