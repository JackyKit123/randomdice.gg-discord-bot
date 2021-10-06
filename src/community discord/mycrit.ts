import Discord from 'discord.js';
import cooldown from '../util/cooldown';

const critRoleIds = [
    '804404283205222441',
    '804404336193044541',
    '804404370120638516',
    '804404612450615346',
    '844412148561739786',
];

export default async function myCrit(message: Discord.Message): Promise<void> {
    const { member, content, guild, channel } = message;

    if (!member || !guild) return;

    const arg = content.replace(/^!mycrit ?/i, '');
    const crit = Number(arg);

    if (Number.isNaN(crit) || !arg) {
        await channel.send(
            'You need to enter your crit%, example: `!myCrit 1337`'
        );
        return;
    }

    let tier = 0;
    critRoleIds.forEach(roleId => {
        const critTier = Number(
            guild.roles.cache.get(roleId)?.name.match(/(\d+)% Crit$/i)?.[1]
        );
        if (Number.isNaN(critTier)) {
            throw new Error(
                'cannot parse the crit role % number, please report this issue.'
            );
        }
        if (crit > critTier && tier < critRoleIds.length - 1) {
            tier += 1;
        }
    });

    if (
        await cooldown(message, '!mycrit', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    await Promise.all(
        critRoleIds.map(async (roleId, i) => {
            if (tier === i) {
                await member.roles.add(roleId);
            } else if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        })
    );
    await channel.send({
        content: `Updated your crit role to be <@&${critRoleIds[tier]}>, you can also update your class role by using \`!myClass\``,
        allowedMentions: {
            users: [],
            roles: [],
            parse: [],
        },
    });
}
