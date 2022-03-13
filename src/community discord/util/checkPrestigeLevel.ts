import { prestigeRoles } from 'config/roleId';
import { Client, GuildMember } from 'discord.js';

export const getPrestigeLevel = (member: GuildMember): number =>
    Number(
        Object.entries(prestigeRoles)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([, roleId]) => member.roles.cache.has(roleId))?.[0] || 0
    );

export const getPrestigeLevelName = (member: GuildMember): string =>
    member.roles.cache
        .sort(({ position: a }, { position: b }) => b - a)
        .filter(role => Object.values(prestigeRoles).includes(role.id))
        .first()?.name ?? '';

export const getPrestigeIcon = (
    client: Client,
    level: number
): string | undefined => {
    const prestigeRoleName = client.guilds.cache
        .get(process.env.COMMUNITY_SERVER_ID ?? '')
        ?.roles.cache.get(prestigeRoles[level])?.name;
    const devServer = client.guilds.cache.get(process.env.DEV_SERVER_ID ?? '');
    const prestigeRoleIconEmoji = devServer?.emojis.cache.find(
        emoji => emoji.name === prestigeRoleName?.replace(' ', '_')
    );
    return prestigeRoleIconEmoji?.toString();
};
