import Discord from 'discord.js';
import * as math from 'mathjs';

export default async function solveMathEquation(
    message: Discord.Message
): Promise<void> {
    const { content, channel } = message;
    if (!content || /^(".+"|'.+'|[\d\w]+|#.|\d+:|:\d+*)$/.test(content)) return;
    try {
        const evaluated = math.evaluate(content);
        const formatted = math.format(evaluated, 14);
        await channel.send({
            content: formatted,
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
            },
        });
    } catch {
        // do nothing
    }
}
