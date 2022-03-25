import checkPermission from 'community discord/util/checkPermissions';
import { tier2RoleIds } from 'config/roleId';
import { CommandInteraction, GuildMember } from 'discord.js';
import { database } from 'register/firebase';
import cooldown from 'util/cooldown';
import wait from 'util/wait';
import { getAfkEmbed } from '.';

const settingAfkTimeout = new Set<GuildMember>();

export async function setAfk(
    member: GuildMember,
    timestamp: number,
    afkMessage: string
): Promise<void> {
    if (settingAfkTimeout.has(member)) return;
    settingAfkTimeout.add(member);
    let { displayName: nickname } = member;
    if (!nickname.startsWith('[AFK]')) {
        nickname = `[AFK] ${nickname}`;
    }
    if (nickname.length > 32 - 7) {
        nickname = `${nickname.slice(0, 32 - 7)}…`;
    }
    if (member.manageable) await member.setNickname(nickname);
    await wait(30 * 1000);
    await database.ref('discord_bot/community/afk').child(member.id).set({
        afkMessage,
        timestamp,
    });
    settingAfkTimeout.delete(member);
}

export default async function afk(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const { member, options, createdTimestamp } = interaction;

    const afkMessage = options.getString('message') || 'AFK';

    if (
        !(await checkPermission(interaction, ...tier2RoleIds)) ||
        (await cooldown(interaction, {
            default: 30 * 1000,
            donator: 30 * 1000,
        }))
    ) {
        return;
    }

    await interaction.reply({
        embeds: [getAfkEmbed(member, afkMessage)],
    });
    await setAfk(member, createdTimestamp, afkMessage);
}
