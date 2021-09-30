import Discord from 'discord.js';
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

export default async function myClass(message: Discord.Message): Promise<void> {
    const { member, content, channel } = message;

    if (!member) {
        return;
    }

    const className = content.replace(/^!myclass ?/i, '');

    const flattened = Object.entries(classRoles);

    const newRoleId = flattened.find(
        ([roleName]) => roleName.toLowerCase() === className.toLowerCase()
    )?.[1];

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

    await Promise.all(
        flattened.map(async ([, roleId]) => {
            if (roleId === newRoleId) {
                await member.roles.add(newRoleId);
            } else if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        })
    );
    await channel.send(
        `Updated your class to be <@&${newRoleId}>, you can also update your crit role by using \`!myCrit\``,
        {
            allowedMentions: {
                users: [],
                roles: [],
                parse: [],
            },
        }
    );
}
