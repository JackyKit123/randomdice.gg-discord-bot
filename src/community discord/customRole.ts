import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    CommandInteraction,
    Guild,
    GuildMember,
    PartialGuildMember,
    Permissions,
    RoleData,
} from 'discord.js';
import colorParser from 'color-parser';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import { tier2RoleIds } from 'config/roleId';
import checkPermission from './util/checkPermissions';

export default async function customRole(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, guild, channel } = interaction;

    if (!channel || !(await checkPermission(interaction, ...tier2RoleIds)))
        return;

    const colorArg = interaction.options.getString('color', true);

    if (
        !/^\w+$/i.test(colorArg) &&
        !/^#[a-f\d]{6}$/i.test(colorArg) &&
        !/^#[a-f\d]{3}$/i.test(colorArg)
    ) {
        await interaction.reply(
            'Invalid color. Use a hex color code or the name of a color.'
        );
        return;
    }
    const roleName = interaction.options.getString('role-name', true);

    const color = colorParser(colorArg);
    if (!color) {
        await reply(interaction, `\`${colorArg}\` is not a valid color.`);
        return;
    }

    if (
        await cooldown(interaction, {
            default: 1000 * 60 * 60,
            donator: 1000 * 60 * 10,
        })
    ) {
        return;
    }

    const customRoleId = cache['discord_bot/community/customroles'][member.id];
    const manageRoleOptions: RoleData = {
        name: `${roleName}‎‎‎`,
        color: [color.r, color.g, color.b].every(colorValue => colorValue === 0)
            ? [1, 1, 1]
            : [color.r, color.g, color.b],
        mentionable: false,
        hoist: false,
        permissions: new Permissions([]),
    };

    if (customRoleId) {
        const role = guild.roles.cache.get(customRoleId);
        if (role) {
            await role.edit(
                manageRoleOptions,
                `/customrole update for ${member.user.tag}`
            );
            await reply(interaction, `Updated ${role}.`);
            return;
        }
    }
    const role = await guild.roles.create({
        ...manageRoleOptions,
        reason: `/customrole creation for  ${member.user.tag}`,
    });
    await database
        .ref('discord_bot/community/customroles')
        .child(member.id)
        .set(role.id);
    await member.roles.add(role);
    await reply(interaction, `Added ${role} to you.`);
}

export async function deleteCustomRole(
    guild: Guild,
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
