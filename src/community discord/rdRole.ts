import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';

const critRoleIds = Object.entries(roleIds)
    .filter(([roleName]) => roleName.endsWith('Crit'))
    .map(([, roleId]) => roleId)
    .sort((a, b) => Number(a) - Number(b));

const classRoles = Object.entries(roleIds)
    .filter(
        ([roleName]) =>
            roleName.startsWith('Class') || roleName.startsWith('Golden Class')
    )
    .map(([roleName, roleId]) => [
        roleName.replace('Golden ', '').replace('Class ', ''),
        roleId,
    ]);
const classRoleIds = classRoles.map(([, roleId]) => roleId);

const getClassRoleId = (string: string): string | undefined =>
    classRoles.find(
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

export async function rdRole(
    input: Message | CommandInteraction
): Promise<void> {
    const member = input.guild?.members.cache.get(input.member?.user.id ?? '');

    if (!member) return;

    const [command, ...args] =
        input instanceof Message
            ? input.content.split(' ')
            : [input.commandName];

    const isMyClass = command.replace('!', '').toLowerCase() === 'myclass';
    const roleList = isMyClass ? classRoleIds : critRoleIds;
    const critArg =
        input instanceof Message
            ? Number(args[0])
            : input.options.getInteger('crit', true);
    const newRoleId = isMyClass
        ? getClassRoleId(
              input instanceof Message
                  ? args.join(' ') ?? ''
                  : input.options.getString('class', true)
          )
        : getCritRoleId(member, critArg);

    if (!newRoleId || (!isMyClass && !Number.isInteger(critArg))) {
        await reply(
            input,
            isMyClass
                ? `Unknown Class, possible values are ${classRoles
                      .map(([roleName]) => `\`${roleName}\``)
                      .join(' ')}`
                : 'You need to enter your crit%, example: `!myCrit 1337`'
        );
        return;
    }

    if (
        await cooldown(input, command, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (hasRole(roleList, member, newRoleId)) {
        await reply(input, {
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

    await reply(input, {
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

    const hasAnyClassRole = classRoles.some(([, roleId]) =>
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

export const commandData: ApplicationCommandData[] = [
    {
        name: 'myclass',
        description: 'Get or update your random dice class role',
        options: [
            {
                name: 'class',
                description: 'Class name',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'mycrit',
        description: 'Get or update your random dice crit role',
        options: [
            {
                name: 'crit',
                description: 'Crit percentage',
                type: 4,
                required: true,
                minValue: 111,
            },
        ],
    },
];
