import * as Discord from 'discord.js';
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

    const messages = await channel.messages.fetch({
        limit: 6,
    });

    if (
        messages.filter(
            msg =>
                stringSimilarity.compareTwoStrings(content, msg.content) > 0.6
        ).size > 1
    ) {
        await message.delete({
            reason:
                'Spam Detection: Duplicated or Similar Crew Ads in the last 5 messages',
        });
        const warningMessage = await channel.send(
            `${author.toString()} I have delete your message. Reason: **Spam Detection: Duplicated or Similar Crew Ads in the last 5 messages**`
        );
        await wait(5000);
        await warningMessage.delete();
    }
}
