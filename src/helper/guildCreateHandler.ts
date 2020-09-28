import * as Discord from 'discord.js';

export default async function handler(
    client: Discord.Client,
    guild: Discord.Guild
): Promise<void> {
    const msgChannel =
        guild.systemChannel ||
        guild.channels.cache.find(
            channel => !!channel.name.match(/(general|welcome)/)
        );

    const logChannel = client.channels.cache.get(
        process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
    ) as Discord.TextChannel;

    if (logChannel) {
        logChannel.send(
            `Timestamp: ${new Date().toTimeString()}, bot is invited to ${
                guild.name
            }`
        );

        if (msgChannel && msgChannel.type === 'text') {
            (msgChannel as Discord.TextChannel).send(
                'Thank you for the invitation, you may do `.gg help` to view a list of commands'
            );
        }

        if (msgChannel) {
            const invite = await msgChannel.createInvite();
            logChannel.send(`Invite link to the server ${invite.code}`);
        }
    }
}
