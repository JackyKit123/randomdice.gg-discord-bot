import { database } from 'register/firebase';
import Discord, {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    Message,
    PartialGuildMember,
} from 'discord.js';
import colorParser from 'color-parser';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import { tier2RoleIds } from 'config/roleId';
import checkPermission from './util/checkPermissions';

export default async function customRole(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild, channel } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    if (!member || !guild || !channel) return;

    if (!(await checkPermission(input, ...tier2RoleIds))) return;

    const colorArg =
        input instanceof Message
            ? input.content.split(' ')[1]
            : input.options.getString('color', true);
    if (!colorArg) {
        await reply(
            input,
            'Usage of the command. `!customrole <color> <role Name>`'
        );
        return;
    }
    const color = colorParser(colorArg);
    const roleName =
        input instanceof Message
            ? input.content.split(' ').slice(2).join(' ').trim()
            : input.options.getString('role-name', true);
    if (!color) {
        await reply(
            input,
            `\`${colorArg}\` is not a valid color. Please include a valid color in the first command parameter.`
        );
        return;
    }
    if (!roleName) {
        await reply(
            input,
            `Please include a role name for your custom role after color.`
        );
        return;
    }
    if (
        await cooldown(input, '!customrole', {
            default: 1000 * 60 * 60,
            donator: 1000 * 60 * 10,
        })
    ) {
        return;
    }

    const customRoleId = cache['discord_bot/community/customroles'][member.id];
    const manageRoleOptions: Discord.RoleData = {
        name: `${roleName}‎‎‎`,
        color: [color.r, color.g, color.b].every(colorValue => colorValue === 0)
            ? [1, 1, 1]
            : [color.r, color.g, color.b],
        mentionable: false,
        hoist: false,
        permissions: [],
    };

    if (customRoleId) {
        const role = guild.roles.cache.get(customRoleId);
        if (role) {
            await role.edit(
                manageRoleOptions,
                `!customrole update for ${member.user.tag}`
            );
            await reply(input, `Updated ${role}.`);
            return;
        }
    }
    const role = await guild.roles.create({
        ...manageRoleOptions,
        reason: `!customrole creation for  ${member.user.tag}`,
    });
    await database
        .ref('discord_bot/community/customroles')
        .child(member.id)
        .set(role.id);
    await member.roles.add(role);
    await reply(input, `Added ${role} to you.`);
}

export async function deleteCustomRole(
    guild: Discord.Guild,
    memberId: string,
    reason?: string
): Promise<void> {
    const memberCustomRoleId =
        cache['discord_bot/community/customroles'][memberId];
    if (!memberCustomRoleId) return;
    await guild.roles.cache.get(memberCustomRoleId)?.delete(reason);
    await database
        .ref('discord_bot/community/customroles')
        .child(memberId)
        .set(null);
}

export async function deleteCustomRoleOnGuildLeave(
    member: GuildMember | PartialGuildMember
): Promise<void> {
    await deleteCustomRole(
        member.guild,
        member.id,
        'custom role owner left the server'
    );
}

export const commandData: ApplicationCommandData = {
    name: 'customrole',
    description: 'Creates a custom role for you.',
    options: [
        {
            name: 'color',
            description: 'The color of the custom role.',
            type: 3,
            required: true,
        },
        {
            name: 'role-name',
            description: 'The name of the custom role.',
            type: 3,
            required: true,
        },
    ],
};
