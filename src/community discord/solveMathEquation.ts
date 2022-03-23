import { Message } from 'discord.js';
import { evaluate, format } from 'mathjs';

export default async function solveMathEquation(
    message: Message
): Promise<void> {
    const { content } = message;
    if (!content || /^(".+"|'.+'|[\d\w]+|#.*|\d+:|:\d+)$/.test(content)) return;
    try {
        const evaluated = evaluate(content);
        const formatted = format(evaluated, 14);
        await message.reply({
            content: formatted,
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
                repliedUser: false,
            },
        });
    } catch {
        // do nothing
    }
}
