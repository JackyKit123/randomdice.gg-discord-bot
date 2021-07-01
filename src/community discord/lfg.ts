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
            member.roles.cache.has('804513079319592980') ||
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
                        '<@&804513079319592980> <@&804496339794264085> <@&806896328255733780> <@&805388604791586826>'
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

    let rawMessage: string;

    if (channel.id === '804224162364129320') {
        embed = embed.setTitle(
            `${member.displayName} is looking for a Random Dice partner!`
        );
        rawMessage = '<@&805757095232274442>';
    } else if (channel.id === '844451218311086120') {
        const otherGameRoleIds = [
            '842102269624975371',
            '806589042254807051',
            '806589112499961877',
            '806589085195829309',
            '810878432836714546',
            '811000478414143488',
        ];
        await channel.send(
            `Which role do you want to ping? respond with the number [1-${otherGameRoleIds.length}].`,
            new Discord.MessageEmbed().setDescription(
                otherGameRoleIds
                    .map((roleId, i) => `${i + 1}: <@&${roleId}>`)
                    .join('\n')
            )
        );
        try {
            const awaitedMessage = await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    newMessage.author === message.author &&
                    !!newMessage.content.match(/^[1-9][0-9]*$/),
                { time: 60000, max: 1, errors: ['time'] }
            );
            const respond = Number(awaitedMessage.first()?.content);
            if (
                Number.isNaN(respond) ||
                respond < 0 ||
                respond > otherGameRoleIds.length
            ) {
                await channel.send('Your respond is out of range.');
                return;
            }
            rawMessage = `${member} is looking for <@&${
                otherGameRoleIds[respond - 1]
            }>`;
        } catch (err) {
            await channel.send('You did not respond in time, aborting.');
            return;
        }
    } else {
        await channel.send(
            'You can only use this command in <#804224162364129320> or <#844451218311086120>.'
        );
        return;
    }

    if (msg.length > 1024) {
        await reply('Your message cannot be longer than 1024 characters.');
        return;
    }
    if (msg) {
        embed = embed.addField('Message', msg);
    }

    if (deletable) await message.delete();
    await channel.send(rawMessage, embed);
}
