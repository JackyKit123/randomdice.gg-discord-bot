import welcomeReward from 'community discord/currency/welcomeReward';
import { GuildMember } from 'discord.js';

export default async function guildMemberAdd(
    member: GuildMember
): Promise<void> {
    const { guild } = member;

    let asyncPromisesCapturer: Promise<unknown>[] = [];
    if (
        process.env.COMMUNITY_SERVER_ID === guild.id &&
        process.env.NODE_ENV === 'production'
    ) {
        asyncPromisesCapturer = [welcomeReward(member)];
    }

    await Promise.all(asyncPromisesCapturer);
}
