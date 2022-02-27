import Discord from 'discord.js';
import cooldown from 'util/cooldown';

export default async function givemoney(
    message: Discord.Message
): Promise<void> {
    const { channel, author, member } = message;
    const numberFormat = new Intl.NumberFormat();

    if (
        await cooldown(message, '!givemoney', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }
    const randomCoins = Math.ceil(Math.random() * 1000);

    await channel.send(
        `Congratulations! You have ${
            author.id === '285696350702796801' &&
            member?.roles.cache.has('804513117228367882')
                ? 'earned'
                : 'lost'
        } <a:Dice_TierX_RickCoin:827059872810008616> ${numberFormat.format(
            randomCoins
        )}!`
    );
}
