import { database } from 'register/firebase';
import stringSimilarity from 'string-similarity';
import {
    ApplicationCommandData,
    CommandInteraction,
    DiscordAPIError,
    Message,
    MessageAttachment,
} from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { tier3RoleIds } from 'config/roleId';
import checkPermission from './util/checkPermissions';

export default async function myEmoji(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, guild, commandName } = interaction;

    if (!(await checkPermission(interaction, ...tier3RoleIds))) return;

    const emojiArg = interaction.options.getString('emoji');
    const attachment = interaction.options.get(
        'attachments'
    ) as unknown as MessageAttachment; // FIXME: will be available in future discord.js versions;
    const emojiRegexMatch = emojiArg?.match(/^<(a)?:[\w\d_]+:(\d{18})>$/);
    const urlRegexMatch = emojiArg?.match(
        /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/
    );
    const userCustomReact =
        cache['discord_bot/community/customreact']?.[member.id];

    let url = attachment?.url;

    if (emojiRegexMatch) {
        const [, isAnimated, emojiID] = emojiRegexMatch;
        const guildEmoji = guild.emojis.cache.get(emojiID);
        if (userCustomReact === guildEmoji?.id) {
            const nameBeforeEdit = guildEmoji.name;
            const nameAfterEdit = (
                await guildEmoji.setName(member.user.username)
            ).name;
            await interaction.reply(
                nameBeforeEdit === nameAfterEdit
                    ? `You already have ${guildEmoji} as your custom emoji.`
                    : `Updated the name of ${guildEmoji} to match your current username.`
            );
            return;
        }
        url = `https://cdn.discordapp.com/emojis/${emojiID}.${
            isAnimated ? 'gif' : 'png'
        }`;
    } else if (urlRegexMatch) {
        [url] = urlRegexMatch;
    } else if (attachment) {
        url = attachment.url;
    } else {
        await interaction.reply(
            'Please include an emoji or an url to the image or an image attachment.'
        );
    }
    if (
        await cooldown(interaction, commandName, {
            default: 10 * 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }
    await interaction.reply(`**__*Uploading you emoji...*__**`);
    const newEmoji = await guild.emojis.create(
        url,
        member.user.username.replaceAll(/[^\d\w_]/g, ''),
        {
            reason: `/myEmoji command used by ${member.user.tag}`,
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
    await interaction.editReply(
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
