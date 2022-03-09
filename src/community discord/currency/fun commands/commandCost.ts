import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import getBalance from '../balance';

export default async function commandCost(
    message: Message,
    cost: number
): Promise<boolean> {
    const { author, channel, content } = message;

    const command = content.split(' ')[0] || '';
    const memberCurrency = cache['discord_bot/community/currency'];
    const ignorePrompt = memberCurrency[author.id].ignoreFunCommandPrompt || [];
    const balance = await getBalance(message, 'emit new member');

    if (balance === false) return false;
    if (balance < cost) {
        await channel.send(
            `You need at least ${coinDice} ${cost} to use \`${command.toLowerCase()}\``
        );
        return false;
    }
    await database
        .ref(`discord_bot/community/currency/${author.id}/balance`)
        .set(balance - cost);
    if (!ignorePrompt.includes(command.toLowerCase())) {
        try {
            (
                await author.send({
                    content: `You used \`${command.toLowerCase()}\` command which costs you ${coinDice} ${cost}, click 🔇 in 60 seconds to stop this notification.`,
                    components: [
                        new MessageActionRow().addComponents([
                            new MessageButton()
                                .setCustomId('🔇')
                                .setEmoji('🔇')
                                .setStyle('DANGER'),
                        ]),
                    ],
                })
            )
                .createMessageComponentCollector({
                    time: 1000 * 60,
                    max: 1,
                })
                .on('collect', async interaction => {
                    await database
                        .ref(
                            `discord_bot/community/currency/${author.id}/ignoreFunCommandPrompt`
                        )
                        .set([...ignorePrompt, command.toLowerCase()]);
                    await interaction.update({
                        content: 'Notification Muted. 🔇',
                        components: [],
                    });
                });
        } catch {
            // do nothing
        }
    }
    return true;
}
