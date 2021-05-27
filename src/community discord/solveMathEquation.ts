import * as Discord from 'discord.js';
import * as math from 'mathjs';

export default async function solveMathEquation(
    message: Discord.Message
): Promise<void> {
    const { content, channel } = message;
    try {
        const evaluated = math.evaluate(content);
        if (typeof evaluated === 'string' || typeof evaluated === 'number')
            await channel.send(evaluated);
    } catch {
        // do nothing
    }
}
