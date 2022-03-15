import logMessage from 'util/logMessage';
import { GuildMember, PartialGuildMember } from 'discord.js';
import { writeModLogOnGenericMute } from 'community discord/moderation/modlog';

export default async function guildMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember | PartialGuildMember
): Promise<void> {
    const { guild, client } = newMember;

    if (process.env.COMMUNITY_SERVER_ID === guild.id) {
        await writeModLogOnGenericMute(oldMember, newMember);
    }
    let asyncPromisesCapturer: Promise<unknown>[] = [];
    if (
        process.env.COMMUNITY_SERVER_ID === guild.id &&
        process.env.NODE_ENV === 'production'
    ) {
        asyncPromisesCapturer = [
            writeModLogOnGenericMute(oldMember, newMember),
        ];
    }

    try {
        await Promise.all(asyncPromisesCapturer);
    } catch (error) {
        await logMessage(
            client,
            'warning',
            `Oops! Something went wrong when handling \`memberUpdate\`\n${
                (error as Error).stack ?? (error as Error).message ?? error
            }`
        );
    }
}
