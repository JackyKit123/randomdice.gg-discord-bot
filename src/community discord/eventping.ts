import { eventManagerRoleIds } from 'config/roleId';
import Discord, {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

export default async function eventPing(
    input: Message | CommandInteraction
): Promise<void> {
    const { channel, guild } = input;

    const msg =
        input instanceof Message
            ? input.content.replace(/!eventping ?/i, '')
            : input.options.getString('message');
    const member = guild?.members.cache.get(input.member?.user.id ?? '');

    if (
        !guild ||
        !member ||
        !channel ||
        !(await checkPermission(input, ...eventManagerRoleIds)) ||
        (await cooldown(input, '!eventping', {
            default: 60 * 1000,
            donator: 60 * 1000,
        }))
    )
        return;

    let embed = new Discord.MessageEmbed()
        .setAuthor({
            name: 'Event Time WOO HOO!!!',
            iconURL:
                guild.iconURL({
                    dynamic: true,
                }) ?? undefined,
        })
        .setColor(member.displayHexColor)
        .setFooter({ text: 'Enjoy the event!' })
        .addField('Hosted by', member.toString());

    if (msg && msg.length > 1024) {
        await reply(
            input,
            'Event detail cannot be longer than 1024 characters.'
        );
        return;
    }
    if (msg) {
        embed = embed.addField('Event Detail', msg);
    }

    if (input instanceof Message) {
        await input.delete();
    } else {
        await input.deferReply();
    }
    await channel.send({ content: '<@&804544088153391124>', embeds: [embed] });
    if (input instanceof CommandInteraction) {
        await input.deleteReply();
    }
}

export const commandData: ApplicationCommandData = {
    name: 'eventping',
    description:
        'Ping members with the event role to let them know the event is starting.',
    options: [
        {
            name: 'message',
            description: 'The message to send to the event pings.',
            type: 3,
        },
    ],
};
