import { getCommunityDiscord } from 'config/guild';
import roleIds from 'config/roleId';
import { Client } from 'discord.js';

export default async function purgeRolesOnReboot(
    client: Client,
    ...roles: (keyof typeof roleIds)[]
): Promise<void> {
    const guild = getCommunityDiscord(client);
    if (!client.user || !guild) return;

    await Promise.all(
        (
            await guild.fetchAuditLogs({
                user: client.user,
                type: 'MEMBER_ROLE_UPDATE',
            })
        ).entries
            .filter(
                ({ createdTimestamp }) =>
                    Date.now() - createdTimestamp <= 1000 * 60 * 10
            )
            .map(async ({ target }) => {
                if (!target) return;
                const member = await guild.members.fetch(target);
                await member.roles.remove(roles.map(roleId => roleIds[roleId]));
            })
    );
}
