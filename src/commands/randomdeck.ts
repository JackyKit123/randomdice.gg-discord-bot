import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { EmojiList } from '../helper/cache';

export default async function RandomDeck(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel } = message;

    const emoji = (await cache(database, 'discord_bot/emoji')) as EmojiList;
    const shuffleArray = Object.keys(emoji)
        .slice(1)
        .map(key => Number(key)) as number[];
    shuffleArray.forEach((_, i) => {
        const random = Math.floor(Math.random() * i);
        [shuffleArray[i], shuffleArray[random]] = [
            shuffleArray[random],
            shuffleArray[i],
        ];
    });
    const pick5dice = shuffleArray.slice(0, 5).map(id => emoji[id]);
    await channel.send(pick5dice.join(''));
}
