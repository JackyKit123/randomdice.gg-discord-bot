import Discord from 'discord.js';

export default async function oneWordStoryValidate(
    message: Discord.Message
): Promise<void> {
    const { content, channel } = message;

    if (channel.id !== '812060019763838986') return;

    const [last2, last1] = channel.messages.cache.last(2);

    if (
        last2?.author?.id === last1?.author?.id ||
        !/^(?:[A-Z]|[a-z]|'|-|\?|\.|!|$|%|\(|\)|\/|\[|\]|‘)+$/i.test(content)
    ) {
        try {
            await message.delete();
        } catch {
            // nothing
        }
    }
}
