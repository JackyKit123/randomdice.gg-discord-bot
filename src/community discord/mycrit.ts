import { GuildMember, Message } from 'discord.js';
import cooldown from '../util/cooldown';

const critRoleIds = [
    '804404283205222441',
    '804404336193044541',
    '804404370120638516',
    '804404612450615346',
    '844412148561739786',
];

const getCritRoleId = (member: GuildMember, crit: number): string => {
    let tier = 0;
    critRoleIds.forEach(roleId => {
        const critTier = Number(
            member.guild.roles.cache
                .get(roleId)
                ?.name.match(/(\d+)% Crit$/i)?.[1]
        );
        if (Number.isNaN(critTier)) {
            throw new Error('cannot parse the crit role % number');
        }
        if (crit > critTier && tier < critRoleIds.length - 1) {
            tier += 1;
        }
    });
    return critRoleIds[tier];
};

const setCritRole = async (
    member: GuildMember,
    assignRoleId: string
): Promise<void[]> =>
    Promise.all(
        critRoleIds.map(async roleId => {
            if (roleId === assignRoleId) {
                await member.roles.add(assignRoleId);
            } else if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        })
    );

const hasCritRole = (member: GuildMember, roleId: string): boolean =>
    critRoleIds.some(
        critRoleId =>
            critRoleId === roleId && member.roles.cache.has(critRoleId)
    );

export default async function myCrit(message: Message): Promise<void> {
    const { member, content, guild, channel } = message;

    if (!member || !guild) return;

    const arg = content.replace(/^!mycrit ?/i, '');
    const crit = Number(arg);

    if (!arg || !Number.isInteger(crit)) {
        await channel.send(
            'You need to enter your crit%, example: `!myCrit 1337`'
        );
        return;
    }

    if (
        await cooldown(message, '!mycrit', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const newRoleId = getCritRoleId(member, crit);

    if (!newRoleId) return;

    const hasRole = hasCritRole(member, newRoleId);

    if (hasRole) {
        await channel.send({
            content: `You already have the <@&${newRoleId}> role`,
            allowedMentions: {
                users: [],
                roles: [],
                parse: [],
            },
        });
        return;
    }

    await setCritRole(member, newRoleId);

    await channel.send({
        content: `Updated your crit role to be <@&${newRoleId}>, you can also update your crit role by using \`!myClass\``,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}

export async function autoCrit(message: Message): Promise<void> {
    const { member, content } = message;

    if (!member || content.toLowerCase().startsWith('!mycrit')) return;

    const matchKeyword = member.displayName.match(/\b([1-9]\d{2,3}) ?%/);

    if (!matchKeyword || Number.isNaN(matchKeyword?.[1])) return;

    const newRoleId = getCritRoleId(member, Number(matchKeyword?.[1]));

    if (!newRoleId) return;

    if (hasCritRole(member, newRoleId)) return;

    const hasAnyCritRole = critRoleIds.some(roleId =>
        member.roles.cache.has(roleId)
    );

    await setCritRole(member, newRoleId);

    await message.reply({
        content: `I have detected ${
            hasAnyCritRole
                ? `that you have updated your name to include \`${matchKeyword?.[0]}\``
                : `the keyword \`${matchKeyword?.[0]}\` in your name`
        }, therefore I have updated your class role to <@&${newRoleId}>, if this is a mistake, you can change your nickname and update your crit role using \`!myCrit\``,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}
