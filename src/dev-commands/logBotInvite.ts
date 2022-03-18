import { communityDiscordInvitePermaLink } from 'config/url';
import { Guild, GuildBasedChannel } from 'discord.js';
import logMessage from 'util/logMessage';
import { createInvite } from './fetchInvites';

export default async function logBotInvite(guild: Guild): Promise<void> {
    const { client, systemChannel, channels, name } = guild;
    const filter = (channel: GuildBasedChannel) =>
        channel.isText() &&
        !channel.isThread() &&
        !!channel.permissionsFor(client.user ?? '')?.has('SEND_MESSAGES');
    const msgChannel =
        systemChannel ||
        channels.cache
            .filter(filter)
            ?.find(channel => !!channel.name?.match(/(general|welcome)/i)) ||
        channels.cache.filter(filter).first();

    await logMessage(
        client,
        'info',
        `Timestamp: ${new Date().toTimeString()}, bot is invited to ${name}`
    );

    const invite = await createInvite(guild);

    await logMessage(client, 'info', invite);

    if (msgChannel?.isText()) {
        await msgChannel.send(
            `Thank you for the invitation, you may do \` /help\` to view a list of commands. You may also join the community discord here at ${communityDiscordInvitePermaLink}`
        );
    }
}
