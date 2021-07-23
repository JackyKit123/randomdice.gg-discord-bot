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

export async function afkResponse(message: Discord.Message): Promise<void> {
    const { guild, member, content, channel, createdTimestamp } = message;
    const database = firebase.app().database();

    if (!guild || !member) return;

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
            } else if (content.includes(uid)) {
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
