import channelIds from 'config/channelIds';
import Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function validateCrewAds(
    message: Discord.Message
): Promise<void> {
    const { channel, author, content } = message;

    if (channel.id !== channelIds['look-for-crew-and-recruiting']) {
        return;
    }

    const messages = channel.messages.cache.last(11);

    if (
        messages.filter(msg => msg.author && msg.author.id === author.id)
            .length > 1
    ) {
        await message.delete();
        const warningMessage = await channel.send(
            `${author.toString()} I have delete your message. Reason: **Spam Detection: You have posted a crew ad in the last 10 messages**`
        );
        await wait(5000);
        await warningMessage.delete();
        return;
    }

    if (
        messages.filter(
            msg =>
                stringSimilarity.compareTwoStrings(content, msg.content) > 0.6
        ).length > 1
    ) {
        await message.delete();
        const warningMessage = await channel.send(
            `${author.toString()} I have delete your message. Reason: **Spam Detection: Duplicated or Similar Crew Ads in the last 10 messages**`
        );
        await wait(5000);
        await warningMessage.delete();
    }
}

export async function fetchExistingCrewAds(
    client: Discord.Client
): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    const channel = guild?.channels.cache.get(
        channelIds['look-for-crew-and-recruiting']
    );
    if (!channel?.isText()) {
        return;
    }

    await channel.messages.fetch({
        limit: 11,
    });
}
