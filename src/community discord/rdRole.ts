import { GuildMember, Message } from 'discord.js';
import cooldown from '../util/cooldown';

const critRoleIds = [
    '804404283205222441',
    '804404336193044541',
    '804404370120638516',
    '804404612450615346',
    '844412148561739786',
];

const classRoles = {
    1: '892923729787641917',
    2: '892923725429743647',
    3: '892923718676934696',
    4: '892923484097900586',
    5: '892923475906424873',
    6: '892923470139252767',
    7: '892923106467909632',
    8: '892923095051034674',
    9: '892923086079393803',
    10: '892922719916658768',
    11: '892922713612623942',
    12: '892922708747247677',
    13: '892922574995066951',
    14: '892922435073114182',
    15: '892922010257199105',
    16: '892921881747943444',
    17: '892921760775802890',
    18: '892921633164099634',
    19: '892921274739867698',
    20: '804404086622781481',
    'Grand 1': '892926128140996719',
    'Grand 2': '892926124345159701',
    'Grand 3': '844363924576141322',
    'Master 1': '892925710417670184',
    'Master 2': '892925705418072105',
    'Master 3': '844364171147476992',
    'Challenger 1': '892924562642198549',
    'Challenger 2': '892924559156707398',
    'Challenger 3': '844364197592694805',
    'Champion 1': '892925074234028073',
    'Champion 2': '892925069586743316',
    'Champion 3': '857459958685499423',
};

const flattened = Object.entries(classRoles);
const classRoleIds = flattened.map(([, roleId]) => roleId);

const getClassRoleId = (string: string): string | undefined =>
    flattened.find(
        ([roleName]) => roleName.toLowerCase() === string.toLowerCase()
    )?.[1];

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

const setRole = async (
    roleList: string[],
    member: GuildMember,
    assignRoleId: string
): Promise<void[]> =>
    Promise.all(
        roleList.map(async roleId => {
            if (roleId === assignRoleId) {
                await member.roles.add(assignRoleId);
            } else if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        })
    );

const hasAnyRole = (roleList: string[], member: GuildMember): boolean =>
    roleList.some(critRoleId => member.roles.cache.has(critRoleId));

const hasRole = (
    roleList: string[],
    member: GuildMember,
    roleId: string
): boolean =>
    roleList.some(
        critRoleId =>
            critRoleId === roleId && member.roles.cache.has(critRoleId)
    );

export async function rdRole(message: Message): Promise<void> {
    const { member, content, channel } = message;

    if (!member) return;

    const [command, ...args] = content.split(' ');

    const isMyClass = command.toLowerCase() === '!myclass';
    const roleList = isMyClass ? classRoleIds : critRoleIds;
    const newRoleId = isMyClass
        ? getClassRoleId(args.join(' ') ?? '')
        : getCritRoleId(member, Number(args[0]));

    if (!newRoleId || (!isMyClass && !Number.isInteger(Number(args[0])))) {
        await channel.send(
            isMyClass
                ? `Unknown Class, possible values are ${flattened
                      .map(([roleName]) => `\`${roleName}\``)
                      .join(' ')}`
                : 'You need to enter your crit%, example: `!myCrit 1337`'
        );
        return;
    }

    if (
        await cooldown(message, command, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (hasRole(roleList, member, newRoleId)) {
        await channel.send({
            content: `You already have <@&${newRoleId}> role`,
            allowedMentions: {
                users: [],
                roles: [],
                parse: [],
            },
        });
        return;
    }

    await setRole(roleList, member, newRoleId);

    const hasAnyOppositeRole = isMyClass
        ? hasAnyRole(critRoleIds, member)
        : hasAnyRole(classRoleIds, member);

    await channel.send({
        content: `Updated your ${
            isMyClass ? 'class' : 'crit'
        } role to be <@&${newRoleId}>${
            !hasAnyOppositeRole
                ? `, you can also update your ${
                      isMyClass ? 'crit' : 'class'
                  } role by using \`${isMyClass ? '!myCrit' : '!myClass'}\``
                : '.'
        }`,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}

export async function autoRole(message: Message): Promise<void> {
    const { member, content } = message;

    if (
        !member ||
        content.toLowerCase().startsWith('!myclass') ||
        content.toLowerCase().startsWith('!mycrit')
    )
        return;

    const matchClassInName =
        member.displayName.match(/\bc(?:lass)? ?(\d{1,2})\b/i) ??
        member.displayName.match(/\b((?:grand|master|challenger) ?[1-3])\b/i);

    const matchCritInName = member.displayName.match(/\b([1-9]\d{2,3}) ?%/);

    const hasAnyClassRole = flattened.some(([, roleId]) =>
        member.roles.cache.has(roleId)
    );

    const hasAnyCritRole = critRoleIds.some(critRoleId =>
        member.roles.cache.has(critRoleId)
    );

    let newClassRole: string | undefined;
    let updatedClassRole = false;
    if (matchClassInName) {
        newClassRole = getClassRoleId(matchClassInName[1]);

        if (newClassRole && !hasRole(classRoleIds, member, newClassRole)) {
            updatedClassRole = true;
            await setRole(classRoleIds, member, newClassRole);
        }
    }

    let newCritRole: string | undefined;
    let updatedCritRole = false;
    if (matchCritInName) {
        newCritRole = getCritRoleId(member, Number(matchCritInName[1]));

        if (newCritRole && !hasRole(critRoleIds, member, newCritRole)) {
            updatedCritRole = true;
            await setRole(critRoleIds, member, newCritRole);
        }
    }

    if (!updatedClassRole && !updatedCritRole) return;

    const updatedBothRoles = updatedClassRole && updatedCritRole;

    const matchResponseText = `the keyword${updatedBothRoles ? 's' : ''} ${
        updatedBothRoles
            ? `\`${matchCritInName?.[0]}\` and \`${matchClassInName?.[0]}\``
            : `\`${matchClassInName?.[0] || matchCritInName?.[0]}\``
    }`;

    const updatedClassRoleText =
        updatedClassRole && `your class role to <@&${newClassRole}>`;
    const updatedCritRoleText =
        updatedCritRole && `your crit role to <@&${newCritRole}>`;
    const updatedResponseText = updatedBothRoles
        ? `${updatedClassRoleText} and ${updatedCritRoleText}`
        : updatedClassRoleText || updatedCritRoleText;

    const useMyClass = updatedClassRole && `your class role using \`!myClass\``;
    const useMyCrit = updatedCritRole && `your crit role using \`!myCrit\``;
    const useResponseText = updatedBothRoles
        ? `${useMyClass} and ${useMyCrit}`
        : useMyClass || useMyCrit;

    await message.reply({
        content: `I have detected ${
            hasAnyClassRole || hasAnyCritRole
                ? `that you have updated your name to include ${matchResponseText}`
                : `${matchResponseText} in your name`
        }, therefore I have updated ${updatedResponseText}, if this is a mistake, you can change your nickname and update ${useResponseText}`,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}
