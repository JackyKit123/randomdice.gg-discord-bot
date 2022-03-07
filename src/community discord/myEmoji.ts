import { database } from 'register/firebase';
import stringSimilarity from 'string-similarity';
import {
    ApplicationCommandData,
    Client,
    CommandInteraction,
    DiscordAPIError,
    Message,
} from 'discord.js';
import axios, { AxiosResponse } from 'axios';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { tier3RoleIds } from 'config/roleId';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

export default async function myEmoji(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    if (!member || !guild) return;

    if (!(await checkPermission(input, ...tier3RoleIds))) return;
    const attachment =
        input instanceof Message ? input.attachments.first() : undefined;
    const emojiArg =
        input instanceof Message
            ? input.content.split(' ')[1]
            : input.options.getString('emoji', true);
    const emojiRegexMatch = emojiArg?.match(/^<(a)?:[\w\d_]+:(\d{18})>$/);
    const urlRegexMatch = emojiArg?.match(
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/
    );
    const userCustomReact =
        cache['discord_bot/community/customreact']?.[member.id];

    let alienEmojiBinary: AxiosResponse<Buffer>;
    if (emojiRegexMatch) {
        const [, isAnimated, emojiID] = emojiRegexMatch;
        const guildEmoji = guild.emojis.cache.get(emojiID);
        if (guildEmoji && userCustomReact === guildEmoji.id) {
            const nameBeforeEdit = guildEmoji.name;
            const nameAfterEdit = (
                await guildEmoji.setName(member.user.username)
            ).name;
            await reply(
                input,
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
    } else if (attachment || urlRegexMatch) {
        if (input instanceof CommandInteraction) await input.deferReply();
        alienEmojiBinary = await axios.get<Buffer>(
            attachment?.url ?? emojiArg,
            {
                responseType: 'arraybuffer',
            }
        );
    } else {
        await reply(
            input,
            'Usage of command\n`!myEmoji <emoji>`\nor\n`!myEmoji` with an image attachment'
        );
        return;
    }
    if (
        await cooldown(input, '!myEmoji', {
            default: 10 * 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }
    const newEmoji = await guild.emojis.create(
        alienEmojiBinary.data,
        member.user.username.replaceAll(/[^\d\w_]/g, ''),
        {
            reason: `!customreaction command used by ${member.user.tag}`,
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
    await reply(
        input,
        `Uploaded ${newEmoji} as your custom emoji and auto reaction.`
    );
}

export async function autoReaction(message: Message): Promise<void> {
    const { guild, content } = message;
    const lowerCased = content.toLowerCase();
    const words = lowerCased.split(' ');
    if (!guild) return;
    await Promise.all(
        Object.entries(cache['discord_bot/community/customreact'] || {}).map(
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
                        stringSimilarity.compareTwoStrings(str, substring) >=
                            0.7
                    );
                };
                try {
                    if (
                        content.includes(uid) ||
                        words.some(
                            (_, i) =>
                                match(username, i) || match(displayName, i)
                        )
                    )
                        await message.react(emojiID);
                } catch (err) {
                    switch ((err as DiscordAPIError).message) {
                        case 'Reaction Blocked':
                        case 'Unknown Message':
                            return;
                        default:
                            throw err;
                    }
                }
            }
        )
    );
}

export async function fetchAutoReactionRegistry(client: Client): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID || ''
    );
    await Promise.all(
        Object.keys(cache['discord_bot/community/customreact'] || {}).map(
            async uid => {
                try {
                    await guild.members.fetch(uid);
                } catch (err) {
                    if ((err as DiscordAPIError).message === 'Unknown Member') {
                        await database
                            .ref('discord_bot/community/customreact')
                            .child(uid)
                            .remove();
                    } else {
                        throw err;
                    }
                }
            }
        )
    );
}

export const commandData: ApplicationCommandData = {
    name: 'myemoji',
    description: 'upload your own custom emoji',
    options: [
        {
            name: 'emoji',
            description: 'the emoji to use, either an url, or the emoji itself',
            type: 3,
            required: true,
        },
    ],
};
