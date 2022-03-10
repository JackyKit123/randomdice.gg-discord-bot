import roleIds, { eventManagerRoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import checkPermission from './util/checkPermissions';

export default async function eventPing(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, channel, guild } = interaction;

    const msg = interaction.options.getString('message');

    if (
        !channel ||
        !(await checkPermission(interaction, ...eventManagerRoleIds)) ||
        (await cooldown(interaction, '!eventping', {
            default: 60 * 1000,
            donator: 60 * 1000,
        }))
    )
        return;

    let embed = new MessageEmbed()
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
        await interaction.reply(
            'Event detail cannot be longer than 1024 characters.'
        );
        return;
    }
    if (msg) {
        embed = embed.addField('Event Detail', msg);
    }

    await interaction.deferReply();
    await channel.send({
        content: `<@&${roleIds['Server Event Ping']}>`,
        embeds: [embed],
    });
    await interaction.deleteReply();
}

export const commandData: ApplicationCommandData = {
    name: 'eventping',
    defaultPermission: false,
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
