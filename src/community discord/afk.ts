import { database } from 'register/firebase';
import Discord, { TextBasedChannel } from 'discord.js';
import { promisify } from 'util';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import parseMsIntoReadableText from 'util/parseMS';

const wait = promisify(setTimeout);

export default async function afk(message: Discord.Message): Promise<void> {
    const { member, content, channel, createdTimestamp } = message;

    if (!member) return;
    const afkMessage = content.replace(/!afk ?/i, '') || 'AFK';

    if (
        !(
            member.roles.cache.has('804512584375599154') ||
            member.roles.cache.has('804231753535193119') ||
            member.roles.cache.has('806896328255733780') ||
            member.roles.cache.has('805388604791586826')
        )
    ) {
        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(`You cannot use !afk`)
                    .setColor('#ff0000')
                    .setDescription(
                        'You need one of the following roles to use this command.\n' +
                            '<@&804512584375599154> <@&804231753535193119> <@&806896328255733780> <@&805388604791586826>'
                    ),
            ],
        });
        return;
    }

    if (member.user.id === '540380357342527498') {
        await message.reply(
            'You are banned from using this command.\n' +
                'If you believe this is an error, please contact a staff member.'
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

    let { displayName } = member;
    if (!displayName.startsWith('[AFK]')) {
        displayName = `[AFK] ${displayName}`;
    }
    if (displayName.length > 32 - 7) {
        displayName = `${displayName.slice(0, 32 - 7)}…`;
    }
    await Promise.all([
        wait(30 * 1000),
        message.reply({
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
    channel: Discord.TextChannel,
    member: Discord.GuildMember,
    {
        content,
        createdTimestamp,
    }: { content?: string; createdTimestamp?: number } = {}
): Promise<void> {
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

export async function afkResponse(message: Discord.Message): Promise<void> {
    const { member, content, channel, createdTimestamp } = message;
    if (!member || channel.type !== 'GUILD_TEXT') return;
    await afkHandler(channel, member, { content, createdTimestamp });
}

export async function removeAfkListener(
    arg: TextBasedChannel | Discord.MessageReaction,
    user: Discord.User | Discord.PartialUser
): Promise<void> {
    const channel =
        arg instanceof Discord.MessageReaction ? arg.message.channel : arg;
    const { COMMUNITY_SERVER_ID } = process.env;
    if (channel.type !== 'GUILD_TEXT' || !COMMUNITY_SERVER_ID) return;
    const { guild } = channel;
    const member = guild.members.cache.get(user.id);
    if (!member || !guild || guild.id !== COMMUNITY_SERVER_ID) return;
    await afkHandler(channel, member);
}
