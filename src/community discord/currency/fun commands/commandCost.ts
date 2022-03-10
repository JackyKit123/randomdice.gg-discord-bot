import { coinDice } from 'config/emojiId';
import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import { getBalance } from '../balance';

export default async function commandCost(
    interaction: CommandInteraction,
    cost: number
): Promise<boolean> {
    const { user, commandName } = interaction;

    const memberCurrency = cache['discord_bot/community/currency'];
    const ignorePrompt = memberCurrency[user.id].ignoreFunCommandPrompt || [];
    const balance = await getBalance(interaction);

    if (balance === null) return false;
    if (balance < cost) {
        await interaction.reply(
            `You need at least ${coinDice} ${cost} to use \`/${commandName}\``
        );
        return false;
    }
    await database
        .ref(`discord_bot/community/currency/${user.id}/balance`)
        .set(balance - cost);
    if (!ignorePrompt.includes(commandName)) {
        try {
            (
                await user.send({
                    content: `You used \`${commandName}\` command which costs you ${coinDice} ${cost}, click 🔇 in 60 seconds to stop this notification.`,
                    components: [
                        new MessageActionRow().addComponents([
                            new MessageButton()
                                .setCustomId('🔇')
                                .setLabel('Mute')
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
                .on('collect', async i => {
                    await database
                        .ref(
                            `discord_bot/community/currency/${user.id}/ignoreFunCommandPrompt`
                        )
                        .set([...ignorePrompt, commandName]);
                    await i.update({
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
