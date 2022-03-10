import channelIds from 'config/channelIds';
import roleIds, { tier2RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import checkPermission from './util/checkPermissions';

export default async function lfg(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, channel, commandName } = interaction;

    const msg = interaction.options.getString('message');

    if (!channel) return;

    if (
        await cooldown(interaction, commandName, {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(interaction, ...tier2RoleIds))) return;

    if (
        channel.id !== channelIds['jackykit-playground-v3'] &&
        channel.id !== channelIds['look-for-games']
    ) {
        await interaction.reply(
            `You can only use this command in <#${channelIds['look-for-games']}>.`
        );
        return;
    }

    if (msg && msg.length > 1024) {
        await interaction.reply(
            'Your message cannot be longer than 1024 characters.'
        );
        return;
    }

    let embed = new MessageEmbed()
        .setAuthor({
            name: member.user.tag,
            iconURL: member.displayAvatarURL({ dynamic: true }),
        })
        .setColor(member.displayHexColor)
        .addField('Ping / DM', member.toString())
        .setTitle(
            `${member.displayName} is looking for a Random Dice partner!`
        );

    if (msg) {
        embed = embed.addField('Message', msg);
    }

    await interaction.deferReply();

    await channel.send({
        content: `<@&${roleIds['Looking for Games Ping']}>`,
        embeds: [embed],
    });

    await interaction.deleteReply();
}

export const commandData: ApplicationCommandData = {
    name: 'lfg',
    description: 'Ping @Looking for game in #looking-for-game',
    options: [
        {
            name: 'message',
            description: 'Message to send with the ping',
            type: 3,
        },
    ],
};
