import * as Discord from 'discord.js';
import logMessage from '../dev-commands/logMessage';

export default async function handler(
    client: Discord.Client,
    guild: Discord.Guild
): Promise<void> {
    const msgChannel =
        guild.systemChannel ||
        guild.channels.cache.find(
            channel => !!channel.name?.match(/(general|welcome)/)
        ) ||
        guild.channels.cache.first();

    logMessage(
        client,
        `Timestamp: ${new Date().toTimeString()}, bot is invited to ${
            guild.name
        }`
    );

    if (msgChannel) {
        const invite = await msgChannel.createInvite();
        logMessage(
            client,
            `Invite link to the server https://discord.gg/${invite.code}`
        );

        if (
            msgChannel instanceof Discord.TextChannel &&
            msgChannel.type === 'text'
        ) {
            msgChannel.send(
                'Thank you for the invitation, you may do `.gg help` to view a list of commands'
            );
        }
    }
}
