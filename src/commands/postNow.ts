import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, {
    News,
    DeckGuide,
    Registry,
    EmojiList,
    Battlefield,
} from '../helper/cache';
import parsedText from '../helper/parseText';
import logMessage from '../dev-commands/logMessage';

export async function postGuide(
    client: Discord.Client,
    database: admin.database.Database,
    member?: Discord.GuildMember,
    updateListener?: {
        snapshot: admin.database.DataSnapshot;
        event: 'added' | 'updated' | 'removed';
    }
): Promise<void> {
    const registeredGuilds = (await cache(
        database,
        'discord_bot/registry'
    )) as Registry;
    const registeredChannels = (
        await Promise.all(
            (Object.entries(registeredGuilds) as [string, { guide?: string }][])
                .filter(([guildId, config]) =>
                    member ? member.guild.id === guildId : config.guide
                )
                .map(async ([, config]) => {
                    if (!config.guide) {
                        throw new Error('missing registered guide channel.');
                    }
                    try {
                        const guideChannel = await client.channels.fetch(
                            config.guide
                        );
                        return guideChannel;
                    } catch {
                        return undefined;
                    }
                })
        )
    ).filter(channel => channel) as Discord.TextChannel[];
    const [guides, battlefields, emojiList] = await Promise.all([
        cache(database, 'decks_guide') as Promise<DeckGuide[]>,
        cache(database, 'wiki/battlefield') as Promise<Battlefield[]>,
        cache(database, 'discord_bot/emoji') as Promise<EmojiList>,
    ]);
    const embeds = (
        await Promise.all(
            ['PvP', 'Co-op', 'Crew']
                .flatMap(type =>
                    guides.filter(
                        guide => guide.type === type && !guide.archived
                    )
                )
                .map(async guide => {
                    const { type, name, battlefield } = guide;
                    const diceList = await Promise.all(
                        guide.diceList.map(async list =>
                            Promise.all(list.map(async die => emojiList[die]))
                        )
                    );
                    const paragraph = parsedText(guide.guide).split('\n');
                    return {
                        name,
                        type,
                        diceList,
                        paragraph,
                        battlefield,
                    };
                })
        )
    )
        .map((parsedData): Discord.MessageEmbed[] => {
            const fields = [
                ...parsedData.diceList.map((list, i, decks) => ({
                    // eslint-disable-next-line no-nested-ternary
                    name: i === 0 ? (decks.length > 1 ? 'Decks' : 'Deck') : '⠀',
                    value: list.join(' '),
                })),
                ...(parsedData.battlefield > -1 && parsedData.type !== 'Crew'
                    ? [
                          {
                              name: 'Battlefield',
                              value:
                                  battlefields.find(
                                      battlefield =>
                                          battlefield.id ===
                                          parsedData.battlefield
                                  )?.name || '*not found*',
                          },
                      ]
                    : []),
                ...parsedData.paragraph
                    .filter(p => p !== '')
                    .map((p, i) => ({
                        name: i === 0 ? 'Guide' : '⠀',
                        value: p,
                    })),
            ];
            return new Array(Math.ceil(fields.length / 16))
                .fill('')
                .map((_, i, arr) => {
                    let embed = new Discord.MessageEmbed()
                        .setColor('#6ba4a5')
                        .addFields(fields.slice(i * 16, i * 16 + 16));
                    if (i === 0) {
                        embed = embed
                            .setTitle(`${parsedData.name} (${parsedData.type})`)
                            .setAuthor(
                                'Random Dice Community Website',
                                'https://randomdice.gg/android-chrome-512x512.png',
                                'https://randomdice.gg/'
                            )
                            .setURL(
                                `https://randomdice.gg/decks/guide/${encodeURI(
                                    parsedData.name
                                )}`
                            );
                    }
                    if (i === arr.length - 1) {
                        embed = embed
                            .setTimestamp()
                            .setFooter(
                                'randomdice.gg Decks Guide',
                                'https://randomdice.gg/android-chrome-512x512.png'
                            );
                    }
                    return embed;
                });
        })
        .flat();
    await Promise.all(
        registeredChannels.map(async channel => {
            const channelPermission = channel.permissionsFor(
                client.user as Discord.ClientUser
            );
            const cantViewChannel = !channelPermission?.has('VIEW_CHANNEL');
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage = !channelPermission?.has(
                'MANAGE_MESSAGES'
            );
            if (cantViewChannel || cantSendMessage || cantDeleteMessage) {
                if (cantViewChannel) {
                    await logMessage(
                        client,
                        `Attempted to send guides in channel ${channel.name} at ${channel.guild.name} but missing permission \`VIEW_CHANNEL\`.`
                    );
                }
                if (cantSendMessage) {
                    await logMessage(
                        client,
                        `Attempted to send guides in channel ${channel.name} at ${channel.guild.name} but missing permission \`SEND_MESSAGES\`.`
                    );
                }
                if (cantDeleteMessage) {
                    await logMessage(
                        client,
                        `Attempted to send guides in channel ${channel.name} at ${channel.guild.name} but missing permission \`MANAGE_MESSAGES\`.`
                    );
                }
                return;
            }
            const fetched = (
                await channel.messages.fetch({ limit: 100 })
            ).filter(message => message.author.id === client.user?.id);
            await channel.bulkDelete(fetched);
            const statusMessage = await channel.send(
                new Discord.MessageEmbed()
                    .setColor('#6ba4a5')
                    .setTimestamp()
                    .setTitle(
                        `${
                            updateListener
                                ? `Deck Guide **${
                                      updateListener.snapshot.val().name
                                  }** is ${
                                      updateListener.snapshot.val().archived
                                          ? 'archived'
                                          : updateListener.event
                                  }.`
                                : `\`.gg postnow guide\` is executed.`
                        } Refreshing all deck guides.`
                    )
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/android-chrome-512x512.png',
                        'https://randomdice.gg/'
                    )
                    .setDescription(
                        member
                            ? `Requested By: ${member.toString()}`
                            : undefined
                    )
            );
            const messageIds = (
                await Promise.all(
                    embeds.map(async embed => {
                        if (embed.footer) {
                            embed
                                .addField('⠀', '⠀')
                                .addField(
                                    'Finished Reading? Click Here to navigate back to the top',
                                    `https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${statusMessage.id}`
                                );
                        }
                        const { id } = await channel.send(embed);
                        return embed.title ? id : undefined;
                    })
                )
            ).filter(id => id !== undefined);
            const guideListEmbed = new Discord.MessageEmbed()
                .setColor('#6ba4a5')
                .setTimestamp()
                .setTitle('Deck Guide List')
                .setDescription(
                    'Click on the url for quick navigation to a guide'
                )
                .setAuthor(
                    'Random Dice Community Website',
                    'https://randomdice.gg/android-chrome-512x512.png',
                    'https://randomdice.gg/'
                )
                .setURL(`https://randomdice.gg/decks/guide/}`)
                .addFields(
                    ['PvP', 'Co-op', 'Crew']
                        .flatMap(type =>
                            guides.filter(
                                guide => guide.type === type && !guide.archived
                            )
                        )
                        .map((guide, i) => ({
                            name: `${guide.name} (${guide.type})`,
                            value: `https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${messageIds[i]}`,
                        }))
                );
            if (statusMessage.editable) {
                await statusMessage.edit(guideListEmbed);
            } else {
                await channel.send(guideListEmbed);
            }

            await channel.send(
                new Discord.MessageEmbed()
                    .setColor('#6ba4a5')
                    .setTimestamp()
                    .setTitle(
                        updateListener
                            ? `Last Updated: Deck Guide **${
                                  updateListener.snapshot.val().name
                              }** is ${
                                  updateListener.snapshot.val().archived
                                      ? 'archived'
                                      : updateListener.event
                              }.`
                            : `Last Updated: \`.gg postnow guide\` is executed. Manual requested refresh.`
                    )
                    .setDescription(
                        `Navigate to the list of guides for quick navigation by clicking here. https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${statusMessage.id}`
                    )
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/android-chrome-512x512.png',
                        'https://randomdice.gg/'
                    )
                    .setFooter(
                        updateListener
                            ? 'Last Updated Timestamp'
                            : `Requested by ${member?.user.username}#${member?.user.discriminator}`,
                        member?.user.avatarURL({ dynamic: true }) ||
                            'https://firebasestorage.googleapis.com/v0/b/random-dice-web.appspot.com/o/Dice%20Images%2FTime?alt=media&token=5c459fc5-4059-4099-b93d-f4bc86debf6d'
                    )
            );
        })
    );
}

export async function postNews(
    client: Discord.Client,
    database: admin.database.Database,
    guild?: Discord.Guild
): Promise<void> {
    const registeredGuilds = (await cache(
        database,
        'discord_bot/registry'
    )) as Registry;
    const registeredChannels = (
        await Promise.all(
            (Object.entries(registeredGuilds) as [string, { news?: string }][])
                .filter(([guildId, config]) =>
                    guild ? guild.id === guildId : config.news
                )
                .map(async ([, config]) => {
                    if (!config.news) {
                        throw new Error('missing registered news channel.');
                    }
                    try {
                        const newsChannel = await client.channels.fetch(
                            config.news
                        );
                        return newsChannel;
                    } catch {
                        return undefined;
                    }
                })
        )
    ).filter(channel => channel) as Discord.TextChannel[];
    const data = (await cache(database, 'news')) as News;

    const ytUrl = data.game.match(
        /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-_]*)(&(amp;)?[\w?=]*)?/
    )?.[0];
    const news = parsedText(data.game);
    const imgUrl = news.match(/{img}((?!.*{img}).*){\/img}/)?.[1];
    const fields = news
        .replace(/{img}((?!.*{img}).*){\/img}/g, '')
        .split('\n\n')
        .map((value, i) => ({
            name: i === 0 ? 'News' : '⠀',
            value,
        }));
    let embed = new Discord.MessageEmbed()
        .setColor('#6ba4a5')
        .setTitle('Random Dice news')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setURL('https://randomdice.gg/')
        .addFields(fields)
        .setTimestamp()
        .setFooter(
            'randomdice.gg News Update',
            'https://randomdice.gg/android-chrome-512x512.png'
        );
    if (imgUrl) {
        embed = embed.setImage(imgUrl);
    }

    await Promise.all(
        registeredChannels.map(async channel => {
            const channelPermission = channel.permissionsFor(
                client.user as Discord.ClientUser
            );
            const cantViewChannel = !channelPermission?.has('VIEW_CHANNEL');
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage = !channelPermission?.has(
                'MANAGE_MESSAGES'
            );
            if (cantViewChannel || cantSendMessage || cantDeleteMessage) {
                if (cantViewChannel) {
                    await logMessage(
                        client,
                        `Attempted to send news in channel ${channel.name} at ${channel.guild.name} but missing permission \`VIEW_CHANNEL\`.`
                    );
                }
                if (cantSendMessage) {
                    await logMessage(
                        client,
                        `Attempted to send news in channel ${channel.name} at ${channel.guild.name} but missing permission \`SEND_MESSAGES\`.`
                    );
                }
                if (cantDeleteMessage) {
                    await logMessage(
                        client,
                        `Attempted to send news in channel ${channel.name} at ${channel.guild.name} but missing permission \`MANAGE_MESSAGES\`.`
                    );
                }
                return;
            }
            const fetched = (
                await channel.messages.fetch({ limit: 100 })
            ).filter(
                message =>
                    message.author.id === client.user?.id &&
                    new Date().valueOf() - message.createdTimestamp <=
                        86400000 * 14
            );
            await channel.bulkDelete(fetched);
            await channel.send(embed);
            if (ytUrl) {
                await channel.send(ytUrl);
            }
        })
    );
}

export default async function postNow(
    message: Discord.Message,
    client: Discord.Client,
    database: admin.database.Database
): Promise<void> {
    const type = message.content.split(' ')[2];
    const { member, guild, channel } = message;
    if (!member || !guild) {
        return;
    }

    if (!member.hasPermission('MANAGE_MESSAGES')) {
        await channel.send(
            'you lack permission to execute this command, required permission: `MANAGE_MESSAGES`'
        );
        return;
    }

    const statusMessage = await channel.send(`Now posting ${type}...`);
    switch (type) {
        case 'guide':
            await postGuide(client, database, member);
            if (statusMessage.editable) {
                await statusMessage.edit(`Finished Posting ${type}`);
            } else {
                await channel.send(`Finished Posting ${type}`);
            }
            return;
        case 'news':
            await postNews(client, database, guild);
            if (statusMessage.editable) {
                await statusMessage.edit(`Finished Posting ${type}`);
            } else {
                await channel.send(`Finished Posting ${type}`);
            }
            return;
        default:
            if (statusMessage.deletable) await statusMessage.delete();
            await channel.send(
                `\`${type}\` is not a valid type, supported type: \`guide\` \`news\``
            );
    }
}
