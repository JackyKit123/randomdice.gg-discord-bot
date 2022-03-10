import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';

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
    roleList.some(roleId => member.roles.cache.has(roleId));

const hasRole = (roleList: string[], member: GuildMember, roleId: string) =>
    roleList.some(id => id === roleId && member.roles.cache.has(id));

export async function myClass(interaction: CommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, options, commandName } = interaction;

    const classArg = options.getString('class', true);
    const newRoleId = getClassRoleId(classArg);
    if (!newRoleId) {
        await interaction.reply(
            `${classArg} is not a valid class. Possible classes are: ${classRoles.map(
                ([roleName]) => roleName
            )}`
        );
        return;
    }

    if (member.roles.cache.has(newRoleId)) {
        await interaction.reply(`You already have <@&${newRoleId}> role`);
        return;
    }

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const hasAnyOppositeRole = hasAnyRole(critRoleIds, member);
    await setRole(classRoleIds, member, newRoleId);

    await interaction.reply(
        `Updated your class role to be <@&${newRoleId}>${
            !hasAnyOppositeRole
                ? `, you can also update your crit role by using \`/mycrit\``
                : '.'
        }`
    );
}

export async function myCrit(interaction: CommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, options, commandName } = interaction;

    const critArg = options.getInteger('crit', true);
    const newRoleId = getCritRoleId(member, critArg);

    if (member.roles.cache.has(newRoleId)) {
        await interaction.reply(`You already have <@&${newRoleId}> role`);
        return;
    }

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const hasAnyOppositeRole = hasAnyRole(classRoleIds, member);
    await setRole(critRoleIds, member, newRoleId);

    await interaction.reply(
        `Updated your crit role to be <@&${newRoleId}>${
            !hasAnyOppositeRole
                ? `, you can also update your class role by using \`/myclass\``
                : '.'
        }`
    );
}

export async function autoClassCritRole(message: Message): Promise<void> {
    const { member } = message;

    if (!member) return;

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

    const useMyClass = updatedClassRole && `your class role using \`/myClass\``;
    const useMyCrit = updatedCritRole && `your crit role using \`/myCrit\``;
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
