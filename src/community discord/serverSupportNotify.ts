import channelIds from 'config/channelIds';
import {
    eventManagerRoleIds,
    moderatorRoleIds,
    tier1RoleIds,
    websiteStaffRoleIds,
} from 'config/roleId';
import { Message } from 'discord.js';

export default async function serverSupportNotify(
    message: Message
): Promise<void> {
    const {
        channel: { id: channelId, messages },
        author: a1,
        client: { user: clientUser },
        member,
    } = message;

    if (
        ![
            channelIds['server-support'],
            channelIds['randomdice-gg-website-support'],
        ].includes(channelId) ||
        (messages.cache.size >= 100
            ? messages.cache
            : await messages.fetch()
        ).some(({ author: a2 }) => a1 === a2) ||
        member?.roles.cache.hasAny(
            ...moderatorRoleIds,
            ...tier1RoleIds,
            ...eventManagerRoleIds,
            ...websiteStaffRoleIds
        )
    )
        return;

    let supportChannelNature = '';
    if (channelId === channelIds['server-support']) {
        supportChannelNature =
            'This channel is for questions or matters related to the community discord **ONLY**. You can get help regarding your roles, navigating the servers, or questions about the bots.';
    }
    if (channelId === channelIds['randomdice-gg-website-support']) {
        supportChannelNature = `This channel is for questions or matters related to the community website **ONLY**. You can get help regarding the website content, website glitches or features, or questions about the ${clientUser}.`;
    }
    await message.reply(
        `It looks like you looking for support here. Please note the following:\n\n>${supportChannelNature} \n> This channel is not for in-game questions. We are not the official developers of this game. We cannot assist you with your account, if you have questions about your account, please contact the game's official support via the in-game menu. If you have questions about the game settings, please ask your questions in ${channelIds['random-dice']} to get help from our community members.\n\nIf you misuse this channel, your questions will not be answered, subsequently you will be muted.`
    );
}
