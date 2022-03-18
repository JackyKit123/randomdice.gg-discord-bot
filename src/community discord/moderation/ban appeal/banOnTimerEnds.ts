import { TextBasedChannel } from 'discord.js';
import { archiveAppeal, reject } from './closeAppeal';

export default async function banOnTimerEnds(
    channel: TextBasedChannel
): Promise<void> {
    if (channel.type !== 'GUILD_TEXT' && channel.type !== 'GUILD_NEWS') return;
    const { guild, client, messages } = channel;

    const membersInAppealRoom = channel.permissionOverwrites.cache.filter(
        overwrite => overwrite.type === 'member'
    );

    if (membersInAppealRoom.size !== 1 || !client.user) return;

    const member = await guild.members.fetch(
        membersInAppealRoom.first()?.id ?? ''
    );

    if (
        (await messages.fetch()).some(
            message => message.author.id === member.id
        )
    )
        return;

    const responseEmbed = await reject(
        member,
        client.user,
        'Member did not respond to the appeal within 24 hours.'
    );
    await channel.send({ embeds: [responseEmbed] });
    await archiveAppeal(channel);
}
