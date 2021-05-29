import * as Discord from 'discord.js';
import cooldown from '../util/cooldown';

const snipeStore = {
    snipe: new Map<string, Discord.Message>(),
    editsnipe: new Map<string, Discord.Message>(),
};

export async function snipeListener(
    type: 'edit' | 'delete',
    message: Discord.Message | Discord.PartialMessage
): Promise<void> {
    if (message.partial) {
        if (type === 'delete') {
            return;
        }
        // eslint-disable-next-line no-param-reassign
        message = await message.fetch();
    }

    const { guild, channel, author } = message;

    if (guild?.id !== process.env.COMMUNITY_SERVER_ID || author.bot) {
        return;
    }

    snipeStore[type === 'delete' ? 'snipe' : 'editsnipe'].set(
        channel.id,
        message
    );
}

export default async function snipe(message: Discord.Message): Promise<void> {
    const { member, channel, content, author } = message;
    const [command] = content.split(' ');

    if (
        !member ||
        (await cooldown(message, command, {
            default: 10 * 1000,
            donator: 2 * 1000,
        }))
    ) {
        return;
    }

    if (
        !(
            member.roles.cache.has('804513079319592980') ||
            member.roles.cache.has('804496339794264085') ||
            member.roles.cache.has('805817742081916988') ||
            member.roles.cache.has('806896328255733780') ||
            member.roles.cache.has('805388604791586826')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle(`You cannot use ${command?.toLowerCase()}`)
                .setColor('#ff0000')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&804513079319592980> <@&804496339794264085> <@&805817742081916988> <@&806896328255733780> <@&805388604791586826>'
                )
        );
        return;
    }

    const sniped = snipeStore[
        command?.toLowerCase().replace('!', '') as 'snipe' | 'editsnipe'
    ].get(channel.id);

    if (!sniped) {
        await channel.send("There's nothing to snipe here");
        return;
    }

    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${sniped.author.username}#${sniped.author.discriminator}`,
            sniped.author.displayAvatarURL({
                dynamic: true,
            })
        )
        .setDescription(sniped.content)
        .setFooter(`Sniped by: ${author.username}#${author.discriminator}`)
        .setTimestamp();

    if (sniped.member && sniped.member.displayHexColor !== '#000000') {
        embed = embed.setColor(sniped.member?.displayHexColor);
    }

    await channel.send(embed);
}
