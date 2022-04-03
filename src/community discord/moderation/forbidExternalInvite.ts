import { getCommunityDiscord } from 'config/guild';
import roleIds, { moderatorRoleIds } from 'config/roleId';
import { Client, Message } from 'discord.js';
import { suppressUnknownMessage } from 'util/suppressErrors';
import { writeModLog } from './modlog';
import Reasons from './reasons.json';
import { dmOffender } from './util';

export async function fetchCommunityDiscordInviteUrls(
    client: Client<true>
): Promise<void> {
    await getCommunityDiscord(client).invites.fetch();
}

export default async function discordInviteLinkSpamAutoMod(
    message: Message<true>
): Promise<void> {
    const {
        guild,
        member,
        content,
        author,
        client: { user: clientUser },
    } = message;
    const regexMatches = content.matchAll(
        /\b(?:https?:\/\/)?(?:\S+\.)?discord(?:(?:app)?\.com\/invite|\.gg)\/(?<code>[\w\d\S]{8,25})\b/g
    );
    const matchesArray = Array.from(regexMatches);
    if (!matchesArray.length) return;
    const externalInvite = matchesArray.some(regexMatch => {
        const code = regexMatch.groups?.code;
        if (!code) return false;
        return (
            guild.invites.cache.every(invite => invite.code !== code) &&
            guild.vanityURLCode !== code
        );
    });

    if (
        !clientUser ||
        !externalInvite ||
        member?.roles.cache.hasAny(roleIds.Admin, ...moderatorRoleIds) ||
        !member?.moderatable
    )
        return;

    const twoHours = 1000 * 60 * 60 * 2;
    await writeModLog(
        author,
        Reasons['Unauthorized Advertising'],
        clientUser,
        'mute',
        twoHours
    );
    await message.delete().catch(suppressUnknownMessage);
    await member.timeout(
        twoHours,
        `Automatic Mute, Reason: ${Reasons['Unauthorized Advertising']}`
    );
    if (guild.me)
        await dmOffender(
            member,
            guild.me,
            'mute',
            Reasons['Unauthorized Advertising'],
            twoHours
        );
}
