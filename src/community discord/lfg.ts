import channelIds from 'config/channelIds';
import roleIds, { tier2RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

export default async function lfg(command: CommandInteraction): Promise<void> {
    if (!command.inCachedGuild()) return;
    const { member, channel, commandName } = command;

    const msg = command.options.getString('message');

    if (!channel) return;

    if (
        await cooldown(command, commandName, {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(command, ...tier2RoleIds))) return;

    if (
        channel.id !== channelIds['jackykit-playground-v3'] &&
        channel.id !== channelIds['look-for-games']
    ) {
        await reply(
            command,
            `You can only use this command in <#${channelIds['look-for-games']}>.`
        );
        return;
    }

    if (msg && msg.length > 1024) {
        await reply(
            command,
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

    await command.deferReply();

    await channel.send({
        content: `<@&${roleIds['Looking for Games Ping']}>`,
        embeds: [embed],
    });

    await command.deleteReply();
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
