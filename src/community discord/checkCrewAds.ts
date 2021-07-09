import Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function validateCrewAds(
    message: Discord.Message
): Promise<void> {
    const { channel, author, content } = message;

    if (channel.id !== '804366933989654589') {
        return;
    }

    const messages = channel.messages.cache.last(11);

    if (
        messages.filter(msg => msg.author && msg.author.id === author.id)
            .length > 1
    ) {
        await message.delete({
            reason: 'Spam Detection: Member has not waited 10 messages',
        });
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
        await message.delete({
            reason:
                'Spam Detection: Duplicated or Similar Crew Ads in the last 10 messages',
        });
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
    const guild = await client.guilds.fetch('804222694488932362');
    const channel = guild.channels.cache.get('804366933989654589');
    if (!channel?.isText()) {
        return;
    }

    await channel.messages.fetch({
        limit: 11,
    });
}
