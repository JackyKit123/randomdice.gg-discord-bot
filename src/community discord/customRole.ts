import firebase from 'firebase-admin';
import Discord from 'discord.js';
import colorParser from 'color-parser';
import cache from '../util/cache';
import cooldown from '../util/cooldown';

export default async function customRole(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { guild, member, content, channel } = message;
    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    if (
        !(
            member.roles.cache.has('804513079319592980') ||
            member.roles.cache.has('804496339794264085') ||
            member.roles.cache.has('806896328255733780') ||
            member.roles.cache.has('805388604791586826')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Unable to cast command')
                .setColor('#ff0000')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&804513079319592980> <@&804496339794264085> <@&806896328255733780> <@&805388604791586826>'
                )
        );
        return;
    }

    const colorArg = content.split(' ')[1];
    if (!colorArg) {
        await channel.send(
            'Usage of the command. `!customrole <color> <role Name>`'
        );
        return;
    }
    const color = colorParser(colorArg);
    const roleName = content.split(' ').slice(2).join(' ').trim();
    if (!color) {
        await channel.send(
            `\`${colorArg}\` is not a valid color. Please include a valid color in the first command parameter.`
        );
        return;
    }
    if (!roleName) {
        await channel.send(
            `Please include a role name for your custom role after color.`
        );
        return;
    }
    if (
        await cooldown(message, '!customrole', {
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
                `!customrole update for ${member.user.username}#${member.user.discriminator}`
            );
            await channel.send(`Updated ${role}.`);
            return;
        }
    }
    const role = await guild.roles.create({
        data: manageRoleOptions,
        reason: `!customrole creation for  ${member.user.username}#${member.user.discriminator}`,
    });
    await database
        .ref('discord_bot/community/customroles')
        .child(member.id)
        .set(role.id);
    await member.roles.add(role);
    await channel.send(`Added ${role} to you.`);
}

export async function deleteCustomRole(
    guild: Discord.Guild,
    database: firebase.database.Database,
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

export async function manageLeave(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { webhookID, embeds, guild, channel } = message;
    const embed = embeds?.[0];
    if (
        channel.id !== '845448948474576946' /* #join-leave-log */ ||
        !webhookID ||
        !embed ||
        !guild
    ) {
        return;
    }
    const { title, footer } = embed;
    if (title !== 'Member left') return;
    const id = footer?.text?.match(/^ID: (\d{18})$/)?.[1];
    if (!id) return;
    await deleteCustomRole(
        guild,
        database,
        id,
        'custom role owner left the server'
    );
}
