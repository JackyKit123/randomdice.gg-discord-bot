import roleIds, { tier2RoleIds } from 'config/roleId';
import Discord, {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

export default async function lfg(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild, channel } = input;

    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    const msg =
        input instanceof Message
            ? input.content.replace(/!lfg ?/i, '')
            : input.options.getString('message');

    if (!member || !guild || !channel) {
        return;
    }

    if (
        await cooldown(input, '!lfg', {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(input, ...tier2RoleIds))) return;

    if (
        channel.id !== '804224162364129320' &&
        channel.id !== '804640084007321600'
    ) {
        await reply(
            input,
            'You can only use this command in <#804224162364129320>.'
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

    if (input instanceof Message) {
        await input.delete();
    } else {
        await input.deferReply();
    }
    await channel.send({
        content: `<@&${roleIds['Looking for Games Ping']}>`,
        embeds: [embed],
    });
    if (input instanceof CommandInteraction) {
        await input.deleteReply();
    }
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
