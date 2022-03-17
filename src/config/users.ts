import { GuildMember, PartialGuildMember, PartialUser, User } from 'discord.js';

export const jackykitId = '195174308052467712';
export const wadeId = '262292101780209671';
export const kebId = '521801175285366785';
export const durgId = '244257879203250176';
export const DSLbotId = '479688142908162059';
export const carlBotId = '235148962103951360';

export const isJackykit = (
    user: string | User | GuildMember | PartialUser | PartialGuildMember
): boolean =>
    typeof user === 'string' ? user === jackykitId : user.id === jackykitId;

export const isDSLbot = (
    user: string | User | GuildMember | PartialUser | PartialGuildMember
): boolean =>
    typeof user === 'string' ? user === DSLbotId : user.id === DSLbotId;

export const isCarlBot = (
    user: string | User | GuildMember | PartialUser | PartialGuildMember
): boolean =>
    typeof user === 'string' ? user === carlBotId : user.id === carlBotId;

export const devUsersId = [jackykitId, wadeId];
export const devUsersMentions = devUsersId.map(id => `<@${id}>`).join(' ');

export const adminUsersId = [jackykitId, kebId, durgId];
