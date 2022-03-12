import roleIds from 'config/roleId';
import { Client } from 'discord.js';

export default async function purgeRolesOnReboot(
    client: Client,
    roleId: keyof typeof roleIds
): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
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
                const member = await guild.members.fetch(target.id);
                if (member.roles.cache.has(roleId))
                    await member.roles.remove(roleId);
            })
    );
}
