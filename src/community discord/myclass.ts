import { GuildMember, Message } from 'discord.js';
import cooldown from '../util/cooldown';

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

const getClassRoleId = (string: string): string | undefined =>
    flattened.find(
        ([roleName]) => roleName.toLowerCase() === string.toLowerCase()
    )?.[1];

const setClassRole = async (
    member: GuildMember,
    assignRoleId: string
): Promise<void[]> =>
    Promise.all(
        flattened.map(async ([, roleId]) => {
            if (roleId === assignRoleId) {
                await member.roles.add(assignRoleId);
            } else if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        })
    );

export default async function myClass(message: Message): Promise<void> {
    const { member, content, channel } = message;

    if (!member) {
        return;
    }

    const className = content.replace(/^!myclass ?/i, '');
    const newRoleId = getClassRoleId(className);

    if (!newRoleId) {
        await channel.send(
            `Unknown Class, possible values are ${flattened
                .map(([roleName]) => `\`${roleName}\``)
                .join(' ')}`
        );
        return;
    }

    if (
        await cooldown(message, '!myclass', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    await setClassRole(member, newRoleId);

    await channel.send({
        content: `Updated your class to be <@&${newRoleId}>, you can also update your crit role by using \`!myCrit\``,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}

export async function autoClass(message: Message): Promise<void> {
    const { member } = message;

    if (!member) return;

    const matchKeyword =
        member.displayName.match(/\bc(?:lass)? ?(\d{1,2})\b/i) ??
        member.displayName.match(/\b((?:grand|master|challenger) ?[1-3])\b/i);

    if (!matchKeyword) return;

    const newRoleId = getClassRoleId(matchKeyword?.[1]);
    if (!newRoleId) return;

    const originalRoleId = flattened.find(([, roleId]) =>
        member.roles.cache.has(roleId)
    )?.[1];

    if (originalRoleId === newRoleId) return;

    await setClassRole(member, newRoleId);

    await message.reply({
        content: originalRoleId
            ? `I have detected that you have updated your name to include \`${matchKeyword?.[0]}\`, therefore I have updated your class role to <@&${newRoleId}>, if this is a mistake, you can change your nickname and update your class role using \`!myClass\``
            : `I have detected the keyword \`${matchKeyword?.[0]}\` in your name, therefore I have assigned you the <@&${newRoleId}> role, You can update this by using the \`!myClass\` command`,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}
