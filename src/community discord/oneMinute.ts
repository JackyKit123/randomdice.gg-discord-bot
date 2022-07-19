import { Message } from 'discord.js';
import { suppressUnknownMessage } from 'util/suppressErrors';
import wait from 'util/wait';

export default async function oneMinute(message: Message): Promise<void> {
    const { content, author } = message;

    if (/\b(a|one|1) ?min(ute)?\b/i.test(content)) {
        await wait(1000 * 60);
        await message
            .reply(`${author}, it's been one minute.`)
            .catch(suppressUnknownMessage);
    }

    if (/\b(a|one|1) ?sec(ond)?\b/i.test(content)) {
        await wait(1000);
        await message
            .reply(`${author}, it's been one second.`)
            .catch(suppressUnknownMessage);
    }
}
