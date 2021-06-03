import Discord from 'discord.js';

export default async function oneMinute(
    message: Discord.Message
): Promise<void> {
    const { content, author, channel } = message;

    if (/\b(a|one|1) ?min(ute)?\b/i.test(content)) {
        setTimeout(
            () => channel.send(`${author}, it's been one minute.`),
            1000 * 60
        );
    }

    if (/\b(a|one|1) ?sec(ond)?\b/i.test(content)) {
        setTimeout(
            () => channel.send(`${author}, it's been one second.`),
            1000
        );
    }
}
