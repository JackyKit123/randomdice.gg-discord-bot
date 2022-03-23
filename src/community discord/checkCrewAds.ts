import channelIds from 'config/channelIds';
import Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import { promisify } from 'util';
import { suppressUnknownMessage } from 'util/suppressErrors';

const wait = promisify(setTimeout);

export default async function validateCrewAds(
    message: Discord.Message
): Promise<void> {
    const { channel, author, content } = message;

    if (channel.id !== channelIds['look-for-crew-and-recruiting']) return;

    const messages =
        channel.messages.cache.size < 11
            ? await channel.messages.fetch({ limit: 11 })
            : channel.messages.cache.last(11);

    const userHasPostedInLast10Messages = messages.some(
        msg => msg !== message && msg.author === author
    );
    const similarMessageExistInLast10Messages = messages.some(
        msg =>
            msg !== message &&
            stringSimilarity.compareTwoStrings(
                msg.content ?? '',
                content ?? ''
            ) > 0.5
    );

    if (!userHasPostedInLast10Messages && !similarMessageExistInLast10Messages)
        return;

    await message.delete().catch(suppressUnknownMessage);
    const warningMessage = await channel.send(
        `${author.toString()} I have delete your message. Reason:\n${
            (userHasPostedInLast10Messages &&
                '**Spam Detection: You have posted a crew ad in the last 10 messages**\n') ||
            ''
        }${
            (similarMessageExistInLast10Messages &&
                '**Spam Detection: Duplicated or Similar Crew Ads in the last 10 messages**') ||
            ''
        }`
    );
    await wait(5000);
    await warningMessage.delete().catch(suppressUnknownMessage);
}
