import firebase from 'firebase-admin';
import Discord from 'discord.js';
import axios, { AxiosResponse } from 'axios';
import cache from '../util/cache';

export default async function myEmoji(message: Discord.Message): Promise<void> {
    const database = firebase.app().database();
    const { member, guild, content, channel, author, attachments } = message;
    if (!member || !guild) return;

    const attachment = attachments.first();
    const emojiArg = content.split(' ')[1];
    const emojiRegexMatch = emojiArg?.match(/^<(a)?:[\w\d_]+:(\d{18})>$/);
    const userCustomReact =
        cache['discord_bot/community/customreact']?.[member.id];

    let alienEmojiBinary: AxiosResponse<Buffer>;
    if (emojiRegexMatch) {
        const [, isAnimated, emojiID] = emojiRegexMatch;
        const guildEmoji = guild.emojis.cache.get(emojiID);
        if (guildEmoji && userCustomReact === guildEmoji.id) {
            const nameBeforeEdit = guildEmoji.name;
            const nameAfterEdit = (await guildEmoji.setName(author.username))
                .name;
            await channel.send(
                nameBeforeEdit === nameAfterEdit
                    ? `You already have ${guildEmoji} as your custom emoji.`
                    : `Updated the name of ${guildEmoji} to match your current username.`
            );
            return;
        }

        alienEmojiBinary = await axios.get<Buffer>(
            `https://cdn.discordapp.com/emojis/${emojiID}.${
                isAnimated ? 'gif' : 'png'
            }`,
            {
                responseType: 'arraybuffer',
            }
        );
    } else if (attachment) {
        alienEmojiBinary = await axios.get<Buffer>(attachment.url, {
            responseType: 'arraybuffer',
        });
    } else {
        await channel.send(
            'Usage of command\n`!myEmoji <emoji>`\nor\n`!myEmoji` with an image attachment'
        );
        return;
    }
    const newEmoji = await guild.emojis.create(
        alienEmojiBinary.data,
        author.username,
        {
            reason: `!customreaction command used by ${author.username}#${author.discriminator}`,
        }
    );
    if (userCustomReact) {
        const previousEmoji = guild.emojis.cache.get(userCustomReact);
        if (previousEmoji) await previousEmoji.delete();
    }
    await database
        .ref('discord_bot/community/customreact')
        .child(member.id)
        .set(newEmoji.id);
    await channel.send(
        `Uploaded ${newEmoji} as your custom emoji and auto reaction.`
    );
}

export async function autoReaction(message: Discord.Message): Promise<void> {
    const { guild, content } = message;
    const lowerCased = content.toLowerCase();
    if (!guild) return;
    const match = Object.entries(
        cache['discord_bot/community/customreact'] || {}
    ).find(([uid]) => {
        const member = guild.members.cache.get(uid);
        return (
            lowerCased.includes(uid) ||
            (member &&
                lowerCased.includes(member.user.username.toLowerCase())) ||
            (member && lowerCased.includes(member.displayName.toLowerCase()))
        );
    });
    if (match) {
        await message.react(match[1]);
    }
}

export async function fetchAutoReactionRegistry(
    client: Discord.Client
): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID || ''
    );
    Object.keys(cache['discord_bot/community/customreact'] || {}).forEach(uid =>
        guild.members.fetch(uid)
    );
}
