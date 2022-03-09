import channelIds from 'config/channelIds';
import roleIds, { tier2RoleIds } from 'config/roleId';
import Discord, {
    ApplicationCommandData,
    CommandInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

export default async function lfg(input: CommandInteraction): Promise<void> {
    if (!input.inCachedGuild()) return;
    const { member, channel, commandName } = input;

    const msg = input.options.getString('message');

    if (!channel) return;

    if (
        await cooldown(input, commandName, {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(input, ...tier2RoleIds))) return;

    if (
        channel.id !== channelIds['jackykit-playground-v3'] &&
        channel.id !== channelIds['look-for-games']
    ) {
        await reply(
            input,
            `You can only use this command in <#${channelIds['look-for-games']}>.`
        );
        return;
    }

    if (msg && msg.length > 1024) {
        await reply(
            input,
            'Your message cannot be longer than 1024 characters.'
        );
        return;
    }

    let embed = new Discord.MessageEmbed()
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

    await input.deferReply();

    await channel.send({
        content: `<@&${roleIds['Looking for Games Ping']}>`,
        embeds: [embed],
    });

    await input.deleteReply();
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
