import firebase from 'firebase-admin';
import Discord from 'discord.js';
import { promisify } from 'util';
import cache from '../util/cache';
import cooldown from '../util/cooldown';
import parseMsIntoReadableText from '../util/parseMS';

const wait = promisify(setTimeout);

export default async function afk(message: Discord.Message): Promise<void> {
    const database = firebase.app().database();
    const { member, content, channel, createdTimestamp } = message;

    if (!member) return;
    const afkMessage = content.replace(/!afk ?/i, '') || 'AFK';

    if (
        !(
            member.roles.cache.has('804512584375599154') ||
            member.roles.cache.has('804496339794264085') ||
            member.roles.cache.has('806896328255733780') ||
            member.roles.cache.has('805388604791586826')
        )
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle(`You cannot use !afk`)
                .setColor('#ff0000')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&804512584375599154> <@&804496339794264085> <@&806896328255733780> <@&805388604791586826>'
                )
        );
        return;
    }

    if (
        await cooldown(message, '!afk', {
            default: 30 * 1000,
            donator: 30 * 1000,
        })
    ) {
        return;
    }

    const displayName =
        member.displayName.length > 32 - 6
            ? `${member.displayName.substring(0, 32 - 6)}…`
            : member.displayName;
    await Promise.all([
        wait(30 * 1000),
        message.reply(`I have set your afk to: ${afkMessage}`, {
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
            },
        }),
        member.manageable ? member.setNickname(`[AFK] ${displayName}`) : null,
    ]);
    await database.ref('discord_bot/community/afk').child(member.id).set({
        afkMessage,
        timestamp: createdTimestamp,
    });
}

async function afkHandler(
    channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel,
    member: Discord.GuildMember,
    {
        content,
        createdTimestamp,
    }: { content?: string; createdTimestamp?: number } = {}
): Promise<void> {
    const database = firebase.app().database();

    Object.entries(cache['discord_bot/community/afk'] || {}).forEach(
        async ([uid, { afkMessage, timestamp }]) => {
            if (uid === member.id) {
                await Promise.all([
                    channel.send(
                        `Welcome back ${member}, I have removed your afk.`
                    ),
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
                await channel.send(
                    `<@${uid}> has been afk for ${parseMsIntoReadableText(
                        createdTimestamp - timestamp,
                        true
                    )
                        .split(' ')
                        .slice(0, 2)
                        .join(' ')}: ${afkMessage}`,
                    {
                        allowedMentions: {
                            parse: [],
                            users: [],
                            roles: [],
                        },
                    }
                );
            }
        }
    );
}

export function isGuild(
    channel: Discord.Channel
): channel is Discord.TextChannel | Discord.NewsChannel {
    return channel.type === 'text' || channel.type === 'news';
}

export async function afkResponse(message: Discord.Message): Promise<void> {
    const { member, content, channel, createdTimestamp } = message;
    if (!member) return;
    await afkHandler(channel, member, { content, createdTimestamp });
}

export async function removeAfkOnTypingStart(
    channel: Discord.Channel | Discord.PartialDMChannel,
    user: Discord.User | Discord.PartialUser
): Promise<void> {
    if (!isGuild(channel)) return;
    const member = channel.guild.member(user.id);
    if (!member) return;
    await afkHandler(channel, member);
}

export async function removeAfkOnReaction(
    reaction: Discord.MessageReaction,
    user: Discord.User | Discord.PartialUser
): Promise<void> {
    const { channel, guild } = reaction.message;
    const { COMMUNITY_SERVER_ID } = process.env;
    if (!COMMUNITY_SERVER_ID || guild?.id !== COMMUNITY_SERVER_ID) return;
    const member = guild.member(user.id);
    if (!member) return;
    await afkHandler(channel, member);
}
