import Discord from 'discord.js';
import firebase from 'firebase-admin';
import cooldown from '../../util/cooldown';
import cache from '../../util/cache';

export default async function multiplierConfig(
    message: Discord.Message
): Promise<void> {
    const { content, member, guild, channel } = message;
    const database = firebase.app().database();

    if (!member || !guild) return;

    if (
        await cooldown(message, `!multi`, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;

    const { multiplier } = cache['discord_bot/community/currencyConfig'];
    const regexMatchArr = content.match(
        /^!multi(?:plier)? (?:<(#|@&)(\d{18})>|(\d{18})) (\d+|blacklist|unblacklist|reset)/i
    );

    if (regexMatchArr === null) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Multiplier Settings')
                .setAuthor(
                    'randomdice.gg',
                    guild.iconURL({ dynamic: true }) ?? undefined
                )
                .setColor('#800080')
                .addField(
                    '**Roles**',
                    ((
                        await Promise.all(
                            Object.entries(multiplier.roles).map(
                                async ([id, multi]) => {
                                    const role = guild.roles.cache.get(id);
                                    if (!role) {
                                        await database
                                            .ref(
                                                `discord_bot/community/currencyConfig/multiplier/roles/${id}`
                                            )
                                            .set(null);
                                        return false;
                                    }
                                    return { role, multi };
                                }
                            )
                        )
                    ).filter(notNull => notNull) as {
                        role: Discord.Role;
                        multi: number;
                    }[])
                        .sort((a, b) => b.role.position - a.role.position)
                        .map(m => `\`${m.multi}\` ${m.role}`)
                        .join('\n') || '*none*',
                    true
                )
                .addField(
                    '**Channels**',
                    ((
                        await Promise.all(
                            Object.entries(multiplier.channels).map(
                                ([id, multi]) => {
                                    const gchannel = guild.channels.cache.get(
                                        id
                                    );
                                    if (!gchannel) {
                                        database
                                            .ref(
                                                `discord_bot/community/currencyConfig/multiplier/channels/${id}`
                                            )
                                            .set(null);
                                        return false;
                                    }
                                    return { channel: gchannel, multi };
                                }
                            )
                        )
                    ).filter(notNull => notNull) as {
                        channel: Discord.GuildChannel;
                        multi: number;
                    }[])
                        .sort((a, b) =>
                            a.channel.parent?.position !==
                            b.channel.parent?.position
                                ? (a.channel.parent || a.channel).position -
                                  (b.channel.parent || b.channel).position
                                : a.channel.position - b.channel.position
                        )
                        .map((m, i, arr) => {
                            if (m.channel.parent) {
                                let output = '';
                                if (
                                    arr[i - 1]?.channel.parent?.id !==
                                    m.channel.parent.id
                                ) {
                                    output += `┎${m.channel.parent}\n`;
                                }
                                if (
                                    arr[i + 1]?.channel.parent?.id !==
                                    m.channel.parent.id
                                ) {
                                    output += `┕\`${m.multi}\` ${m.channel}`;
                                } else {
                                    output += `┝\`${m.multi}\` ${m.channel}`;
                                }
                                return output;
                            }
                            return `${m.multi}\` ${m.channel}`;
                        })
                        .join('\n') || '*none*',
                    true
                )
                .addField(
                    '**Blacklisted**',
                    (
                        await Promise.all(
                            multiplier.blacklisted?.map(async id =>
                                // eslint-disable-next-line no-nested-ternary
                                guild.roles.cache.has(id)
                                    ? `<@&${id}>`
                                    : guild.channels.cache.has(id)
                                    ? `<#${id}>`
                                    : database
                                          .ref(
                                              `discord_bot/community/currencyConfig/multiplier/blacklisted/`
                                          )
                                          .set(
                                              multiplier.blacklisted.filter(
                                                  i => id !== i
                                              )
                                          )
                            ) || []
                        )
                    ).join('\n') || '*none*',
                    true
                )
        );
        return;
    }

    const [, type, id1, id2, multi] = Array.from(regexMatchArr);

    if (
        !(Number(multi) >= 0) &&
        !/(?:blacklist|unblacklist|reset)/.test(multi)
    ) {
        await channel.send(
            'Multiplier value should be a positive integer or `blacklist` or `reset`'
        );
        return;
    }

    const unBlacklist = async (multiType: '@&' | '#'): Promise<void> => {
        await database
            .ref(`discord_bot/community/currencyConfig/multiplier/blacklisted/`)
            .set(multiplier.blacklisted.filter(id => id !== id1 || id2));
        await channel.send(
            new Discord.MessageEmbed()
                .setDescription(`Unblacklisted <${multiType}${id1 || id2}>`)
                .setColor('#eeeeee')
        );
    };
    const setBlacklist = async (multiType: '@&' | '#'): Promise<void> => {
        await database
            .ref(`discord_bot/community/currencyConfig/multiplier/blacklisted/`)
            .set([...multiplier.blacklisted, id1 || id2]);
        await channel.send(
            new Discord.MessageEmbed()
                .setDescription(`Blacklisted <${multiType}${id1 || id2}>`)
                .setColor('#000000')
        );
    };
    const setMulti = async (multiType: 'roles' | 'channels'): Promise<void> => {
        await database
            .ref(
                `discord_bot/community/currencyConfig/multiplier/${multiType}/${
                    id1 || id2
                }`
            )
            .set(
                Number(multi) === 0 || multi === 'reset' ? null : Number(multi)
            );
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Success')
                .setDescription(
                    `Succefully ${
                        Number(multi) === 0 || multi === 'reset'
                            ? 'reset'
                            : 'set'
                    } <${
                        type === '#' || multiType === 'channels' ? '#' : '@&'
                    }${id1 || id2}> to \`${multi === 'reset' ? '0' : multi}\``
                )
                .setColor('#39ff14')
        );
    };
    if (id2) {
        if (guild.roles.cache.has(id2)) {
            if (multi === 'unblacklist') {
                await unBlacklist('@&');
                return;
            }
            if (multi === 'blacklist') {
                await setBlacklist('@&');
                return;
            }
            await setMulti('roles');
            return;
        }
        if (guild.channels.cache.has(id2)) {
            if (multi === 'unblacklist') {
                await unBlacklist('#');
                return;
            }
            if (multi === 'blacklist') {
                await setBlacklist('#');
                return;
            }
            await setMulti('channels');
            return;
        }
        await channel.send(`Cannot find a channel or role with id \`${id2}\`.`);
        return;
    }
    if (type === '#') {
        if (guild.channels.cache.has(id1)) {
            if (multi === 'unblacklist') {
                await unBlacklist('#');
                return;
            }
            if (multi === 'blacklist') {
                await setBlacklist('#');
                return;
            }
            await setMulti('channels');
            return;
        }
        await channel.send(`Cannot find channel <#${id1}>.`);
        return;
    }
    if (guild.roles.cache.has(id1)) {
        if (multi === 'unblacklist') {
            await unBlacklist('@&');
            return;
        }
        if (multi === 'blacklist') {
            await setBlacklist('@&');
            return;
        }
        await setMulti('roles');
        return;
    }
    await channel.send(`Cannot find role <#${id1}>.`);
}
