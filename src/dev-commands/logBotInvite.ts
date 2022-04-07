import { communityDiscordInvitePermaLink } from 'config/url';
import { Guild, GuildBasedChannel, GuildTextBasedChannel } from 'discord.js';
import logMessage from 'util/logMessage';
import { createInvite } from './fetchInvites';

export default async function logBotInvite(guild: Guild): Promise<void> {
    const { client, systemChannel, channels, name, me: bot } = guild;

    const channelsWithPermissions = channels.cache.filter(
        (channel: GuildBasedChannel): channel is GuildTextBasedChannel =>
            channel.isText() &&
            !channel.isThread() &&
            !!bot?.permissionsIn(channel).has('SEND_MESSAGES') &&
            bot.permissionsIn(channel).has('VIEW_CHANNEL')
    );
    const msgChannel =
        channelsWithPermissions.find(channel => channel === systemChannel) ||
        channelsWithPermissions.find(({ name: channelName }) =>
            ['general', 'welcome'].includes(channelName.toLowerCase())
        ) ||
        channelsWithPermissions.first();

    await logMessage(
        client,
        'info',
        `Timestamp: ${new Date().toTimeString()}, bot is invited to ${name}`
    );

    const invite = await createInvite(guild);

    await logMessage(client, 'info', invite);

    await msgChannel?.send(
        `Thank you for the invitation, you may do \` /help\` to view a list of commands. You may also join the community discord here at ${communityDiscordInvitePermaLink}`
    );
}
