import Discord from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';

export default async function setEmoji(
    message: Discord.Message
): Promise<void> {
    const { dice } = cache;
    const { client, content, channel } = message;
    const [, , emoji, ...splitDiceName] = content.split(' ');
    const diceName = splitDiceName.join(' ');
    if (!emoji) {
        await channel.send(
            'Please include the emoji and dice name in command parameter.'
        );
        return;
    }
    const emojiId = emoji.match(/^<:.+:([0-9]+)>$/)?.[1];
    if (!emojiId) {
        await channel.send(`\`${emoji}\` is not valid emoji`);
        return;
    }
    const newEmoji = client.emojis.cache.get(emojiId);
    if (!newEmoji) {
        await channel.send(
            `\`${emoji}\` comes from a server that the bot do not live in, please use another emoji.`
        );
        return;
    }

    const die = dice.find(d => d.name.toLowerCase() === diceName.toLowerCase());
    if (!die && diceName !== '?') {
        await channel.send(`\`${diceName}\` is not valid dice`);
        return;
    }
    const dieId = die?.id || -1;
    await database.ref(`/discord_bot/emoji/${dieId}`).set(emoji);
    await database
        .ref('last_updated/discord_bot')
        .set(new Date().toISOString());
    await channel.send(`Successfully set ${emoji} as emoji for ${diceName}`);
}
