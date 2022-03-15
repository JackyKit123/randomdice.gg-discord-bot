import { appealServerChannelId } from 'config/channelIds';
import { MessageEmbed, TextBasedChannel } from 'discord.js';
import { archiveAppeal } from './closeAppeal';

export default async function banOnTimerEnds(
    channel: TextBasedChannel
): Promise<void> {
    if (channel.type !== 'GUILD_TEXT') return;
    const { guild, client, messages } = channel;

    const membersInAppealRoom = channel.permissionOverwrites.cache.filter(
        overwrite => overwrite.type === 'member'
    );

    if (membersInAppealRoom.size !== 1) return;

    const member = await guild.members.fetch(
        membersInAppealRoom.first()?.id ?? ''
    );

    if (
        (await messages.fetch()).some(
            message => message.author.id === member.id
        )
    )
        return;

    await member.ban({
        reason: 'Appeal rejected. Member did not respond to the appeal within 24 hours.',
    });

    try {
        await member.send(
            `Your appeal is rejected.\nReason: You did not respond to the appeal within 24 hours.`
        );
    } finally {
        await guild.members.ban(member, {
            reason: 'Appeal rejected.\nMember did not respond to the appeal within 24 hours.',
        });
        const appealLog = new MessageEmbed()
            .setAuthor({
                name: member.user.tag,
                iconURL: member.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp()
            .addField(
                'Appeal closed by',
                `${client.user?.username}\n${client.user}`
            )
            .setTitle('Appeal rejected')
            .setColor('#ff3434');
        await archiveAppeal(guild, channel);
        await channel.send({ embeds: [appealLog] });
        const logChannel = guild.channels.cache.get(appealServerChannelId.log);
        if (logChannel?.isText()) {
            await logChannel.send({ embeds: [appealLog] });
        }
    }
}
