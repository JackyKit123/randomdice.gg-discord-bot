import { Guild, TextChannel, VoiceChannel } from 'discord.js';
import logMessage from 'dev-commands/logMessage';

export default async function handler(guild: Guild): Promise<void> {
    const { client, systemChannel, channels, name } = guild;
    const msgChannel =
        systemChannel ||
        channels.cache.find(
            channel => !!channel.name?.match(/(general|welcome)/i)
        ) ||
        channels.cache.first();

    logMessage(
        client,
        `Timestamp: ${new Date().toTimeString()}, bot is invited to ${name}`
    );

    if (
        !msgChannel ||
        !(
            msgChannel instanceof TextChannel ||
            msgChannel instanceof VoiceChannel
        )
    )
        return;

    const invite = await msgChannel.createInvite();
    logMessage(
        client,
        `Invite link to the server https://discord.gg/${invite.code}`
    );

    if (msgChannel.isText()) {
        msgChannel.send(
            'Thank you for the invitation, you may do `.gg help` to view a list of commands. You may also join the community discord here at https://discord.gg/ZrXRpZq2mq'
        );
    }
}
