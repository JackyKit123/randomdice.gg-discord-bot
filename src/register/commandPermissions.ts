import roleId, { eventManagerRoleIds, moderatorRoleIds } from 'config/roleId';
import {
    ApplicationCommand,
    ApplicationCommandPermissions,
    Collection,
    Snowflake,
} from 'discord.js';

const getPermission = (id: Snowflake): ApplicationCommandPermissions => ({
    type: 'ROLE',
    permission: true,
    id,
});

const adminPermission = getPermission(roleId.Admin);
const modPermissions = moderatorRoleIds.map(getPermission);
const eventManagerPermissions = eventManagerRoleIds.map(getPermission);

const adminOnly: {
    permissions: ApplicationCommandPermissions[];
} = {
    permissions: [adminPermission],
};

const adminAndModOnly: {
    permissions: ApplicationCommandPermissions[];
} = {
    permissions: [adminPermission, ...modPermissions],
};

const adminAndEventManagerPermissions: {
    permissions: ApplicationCommandPermissions[];
} = {
    permissions: [adminPermission, ...eventManagerPermissions],
};

export default async function setCommandPermissions(
    commandManager: Collection<string, ApplicationCommand>
): Promise<void> {
    await Promise.all(
        commandManager.map(async command => {
            switch (command.name) {
                case 'application':
                case 'leaderboard-reset':
                    await command.permissions.set(adminOnly);
                    break;
                case 'closereport':
                    await command.permissions.set(adminAndModOnly);
                    break;
                case 'eventping':
                case 'coinbomb':
                case 'currency-audit':
                    await command.permissions.set(
                        adminAndEventManagerPermissions
                    );
                    break;
                default:
            }
        })
    );
}
