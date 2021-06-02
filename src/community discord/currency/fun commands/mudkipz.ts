import * as Discord from 'discord.js';

export default async function mudkipz(message: Discord.Message): Promise<void> {
    const { channel, author, member } = message;
    const numberFormat = new Intl.NumberFormat();

    try {
        await message.delete();
    } catch {
        // do nothing
    }

    const randomCoins = Math.floor(Math.random() * 1000000);

    await channel.send(
        `Congratulations! You have ${
            author.id === '285696350702796801' &&
            member?.roles.cache.has('805727466219372546')
                ? 'received'
                : 'lost'
        } <a:Dice_TierX_RickCoin:827059872810008616> ${numberFormat.format(
            randomCoins
        )}!`
    );
}
