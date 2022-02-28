import { database } from 'register/firebase';
import stringSimilarity from 'string-similarity';
import Discord, { DiscordAPIError } from 'discord.js';
import axios, { AxiosResponse } from 'axios';
import cache from 'util/cache';
import cooldown from 'util/cooldown';

export default async function myEmoji(message: Discord.Message): Promise<void> {
    const { member, guild, content, channel, author, attachments } = message;
    if (!member || !guild) return;

    if (
        !member.roles.cache.has('804512584375599154') &&
        !member.roles.cache.has('809142956715671572')
    ) {
        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(`You cannot use custom emoji command.`)
                    .setColor('#ff0000')
                    .setDescription(
                        'You need one of the following roles to use this command.\n' +
                            '<@&804512584375599154> <@&809142956715671572>\n'
                    ),
            ],
        });
        return;
    }
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
    if (
        await cooldown(message, '!myEmoji', {
            default: 10 * 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }
    const newEmoji = await guild.emojis.create(
        alienEmojiBinary.data,
        author.username.replaceAll(/[^\d\w_]/g, ''),
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
    const words = lowerCased.split(' ');
    if (!guild) return;
    Object.entries(cache['discord_bot/community/customreact'] || {}).forEach(
        async ([uid, emojiID]) => {
            const member = guild.members.cache.get(uid);
            if (!member) return;
            const username = member.user.username.toLowerCase();
            const displayName = member.displayName.toLowerCase();

            const match = (str: string, i: number): boolean => {
                const substring = words
                    .slice(i, i + str.split(' ').length)
                    .join(' ');
                if (substring.length < 3) return false;
                return (
                    (stringSimilarity.compareTwoStrings(str, substring) >=
                        0.5 &&
                        str.startsWith(substring)) ||
                    stringSimilarity.compareTwoStrings(str, substring) >= 0.7
                );
            };
            try {
                if (
                    content.includes(uid) ||
                    words.some(
                        (_, i) => match(username, i) || match(displayName, i)
                    )
                )
                    await message.react(emojiID);
            } catch (err) {
                if ((err as DiscordAPIError).message === 'Unknown Message')
                    return;
                throw err;
            }
        }
    );
}

export async function fetchAutoReactionRegistry(
    client: Discord.Client
): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID || ''
    );
    await Promise.all(
        Object.keys(cache['discord_bot/community/customreact'] || {}).map(
            async uid => {
                try {
                    await guild.members.fetch(uid);
                } catch {
                    // do nothing
                }
            }
        )
    );
}
