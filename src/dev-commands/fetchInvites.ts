import * as Discord from 'discord.js';
import logMessage from './logMessage';

export default async function createInvites(
    client: Discord.Client
): Promise<void> {
    const creatingMessage = await logMessage(
        client,
        'Creating Invites... Please allow sometime.'
    );
    const createdInvites = await Promise.all(
        client.guilds.cache.map(async guildData => {
            try {
                const code = (
                    await guildData.channels.cache
                        .find(
                            channel =>
                                channel.name === 'welcome' ||
                                channel.name === 'general' ||
                                channel.type === 'text'
                        )
                        ?.createInvite()
                )?.code;
                return {
                    name: guildData.name,
                    code,
                };
            } catch (err) {
                return {
                    name: guildData.name,
                    error: err.message,
                };
            }
        })
    );

    await creatingMessage?.edit(
        `Here is a list of guilds that the bot is in as of ${new Date().toISOString()}:\n${createdInvites
            .map(inviteData =>
                inviteData.code
                    ? `https://discord.gg/${inviteData.code} : ${inviteData.name}`
                    : `Error For ${inviteData.name} - ${inviteData.error}`
            )
            .join('\n')}`
    );
}
