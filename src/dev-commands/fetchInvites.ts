import Discord from 'discord.js';

export default async function createInvites(
    message: Discord.Message
): Promise<void> {
    const { client, content, channel } = message;

    const guildId = content.split(' ')[2]?.match(/^\d{18}$/)?.[0];

    const makeInvites = async (
        guildData: Discord.Guild
    ): Promise<{
        name: string;
        code?: string;
        error?: string;
    }> => {
        try {
            const code = (
                await guildData.channels.cache
                    .find(
                        c =>
                            c.name === 'welcome' ||
                            c.name === 'general' ||
                            c.type === 'text'
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
    };

    if (guildId) {
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            await channel.send(
                `Guild id: \`${guildId}\` is not a server I am in.`
            );
            return;
        }

        const res = await makeInvites(guild);
        await channel.send(
            res.code
                ? `Invite for server \`${res.name}\`: https://discord.gg/${res.code}`
                : `Error For ${res.name} - ${res.error}`
        );
        return;
    }

    const creatingMessage = await channel.send(
        'Creating Invites... Please allow sometime.'
    );
    const createdInvites = await Promise.all(
        client.guilds.cache.map(makeInvites)
    );

    if (creatingMessage?.editable)
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
