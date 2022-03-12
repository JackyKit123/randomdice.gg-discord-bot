import createAppealChanel from 'community discord/ban appeal/createAppealChannel';
import welcomeReward from 'community discord/currency/welcomeReward';
import logMessage from 'util/logMessage';
import { GuildMember } from 'discord.js';

export default async function guildMemberAdd(
    member: GuildMember
): Promise<void> {
    const { guild, client } = member;

    const asyncPromisesCapturer: Promise<unknown>[] = [];
    if (process.env.NODE_ENV === 'production') {
        switch (guild.id) {
            case process.env.COMMUNITY_SERVER_ID:
                asyncPromisesCapturer.push(welcomeReward(member));
                break;
            case process.env.COMMUNITY_APPEAL_SERVER_ID:
                asyncPromisesCapturer.push(createAppealChanel(member));
                break;
            default:
        }
    }
    try {
        await Promise.all(asyncPromisesCapturer);
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong when listening to guildMemberAdd in server ${
                guild.name
            }.\n${(err as Error).stack ?? (err as Error).message ?? err}`
        );
    }
}
