import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    Interaction,
    Message,
    MessageReaction,
    PartialUser,
    TextBasedChannel,
    TextChannel,
    User,
} from 'discord.js';
import { promisify } from 'util';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import parseMsIntoReadableText from 'util/parseMS';
import { tier2RoleIds } from 'config/roleId';
import { isCommunityDiscord } from 'config/guild';
import checkPermission from './util/checkPermissions';

const wait = promisify(setTimeout);

export default async function afk(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, options, createdTimestamp } = interaction;

    const afkMessage = options.getString('message') || 'AFK';

    if (
        !(await checkPermission(interaction, ...tier2RoleIds)) ||
        (await cooldown(interaction, {
            default: 30 * 1000,
            donator: 30 * 1000,
        }))
    ) {
        return;
    }

    let { displayName } = member;
    if (!displayName.startsWith('[AFK]')) {
        displayName = `[AFK] ${displayName}`;
    }
    if (displayName.length > 32 - 7) {
        displayName = `${displayName.slice(0, 32 - 7)}…`;
    }
    await Promise.all([
        wait(30 * 1000),
        interaction.reply({
            content: `I have set your afk to: ${afkMessage}`,
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
            },
        }),
        member.manageable ? member.setNickname(displayName) : null,
    ]);
    await database.ref('discord_bot/community/afk').child(member.id).set({
        afkMessage,
        timestamp: createdTimestamp,
    });
}

async function afkHandler(
    channel: TextChannel,
    member: GuildMember,
    {
        content,
        createdTimestamp,
    }: { content?: string; createdTimestamp?: number } = {}
): Promise<void> {
    Object.entries(cache['discord_bot/community/afk'] || {}).forEach(
        async ([uid, { afkMessage, timestamp }]) => {
            if (uid === member.id) {
                if (channel.permissionsFor(uid)?.has('SEND_MESSAGES')) {
                    await channel.send(
                        `Welcome back ${member}, I have removed your afk.`
                    );
                }
                await Promise.all([
                    database
                        .ref('discord_bot/community/afk')
                        .child(member.id)
                        .set(null),
                    member.manageable
                        ? member.setNickname(
                              member.displayName.replace(/^\[AFK\] /, '')
                          )
                        : null,
                ]);
                return;
            }
            if (content?.includes(uid) && createdTimestamp) {
                await channel.send({
                    content: `<@${uid}> has been afk for ${parseMsIntoReadableText(
                        createdTimestamp - timestamp,
                        true
                    )
                        .split(' ')
                        .slice(0, 2)
                        .join(' ')}: ${afkMessage.replace(
                        /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
                        match => `<${match}>`
                    )}`,
                    allowedMentions: {
                        parse: [],
                        users: [],
                        roles: [],
                    },
                });
            }
        }
    );
}

export async function afkResponse(message: Message): Promise<void> {
    const { member, content, channel, createdTimestamp } = message;
    if (!member || channel.type !== 'GUILD_TEXT') return;
    await afkHandler(channel, member, { content, createdTimestamp });
}

export async function removeAfkListener(
    arg: TextBasedChannel | MessageReaction | Interaction,
    user: User | PartialUser
): Promise<void> {
    const channel = arg instanceof MessageReaction ? arg.message.channel : arg;
    if (channel.type !== 'GUILD_TEXT') return;
    const { guild } = channel;
    const member = guild.members.cache.get(user.id);
    if (!member || !isCommunityDiscord(guild)) return;
    await afkHandler(channel, member);
}

export const commandData: ApplicationCommandData = {
    name: 'afk',
    description: 'Set your afk status',
    options: [
        {
            name: 'message',
            description: 'The message to display when you are afk',
            type: 'STRING',
        },
    ],
};
