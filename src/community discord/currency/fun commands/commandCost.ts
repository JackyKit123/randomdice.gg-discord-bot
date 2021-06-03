import Discord from 'discord.js';
import firebase from 'firebase-admin';
import getBalance from '../balance';
import cache from '../../../util/cache';

export default async function commandCost(
    message: Discord.Message,
    cost: number
): Promise<boolean> {
    const app = firebase.app();
    const database = app.database();
    const { author, channel, content } = message;

    const command = content.split(' ')[0] || '';
    const memberCurrency = cache['discord_bot/community/currency'];
    const ignorePrompt = memberCurrency[author.id].ignoreFunCommandPrompt || [];
    const balance = await getBalance(message, 'emit new member');

    if (balance === false) return false;
    if (balance < cost) {
        await channel.send(
            `You need at least <:dicecoin:839981846419079178> ${cost} to use \`${command.toLowerCase()}\``
        );
        return false;
    }
    await database
        .ref(`discord_bot/community/currency/${author.id}/balance`)
        .set(balance - cost);
    if (!ignorePrompt.includes(command.toLowerCase())) {
        try {
            const notification = await author.send(
                `You used \`${command.toLowerCase()}\` command which costs you <:dicecoin:839981846419079178> ${cost}, react to 🔇 in 60 seconds to stop this notification.`
            );
            await notification.react('🔇');
            notification
                .createReactionCollector(
                    (reaction: Discord.MessageReaction, user: Discord.User) =>
                        reaction.emoji.name === '🔇' && user.id === author.id,
                    {
                        time: 1000 * 60,
                        max: 1,
                    }
                )
                .on('collect', () =>
                    database
                        .ref(
                            `discord_bot/community/currency/${author.id}/ignoreFunCommandPrompt`
                        )
                        .set([...ignorePrompt, command.toLowerCase()])
                );
        } catch {
            // do nothing
        }
    }
    return true;
}
