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
    guild?: Discord.Guild
): Promise<void> {
    const registeredGuilds = (await cache(
        database,
        'discord_bot/registry'
    )) as Registry;
    const registeredChannels = Object.entries(registeredGuilds)
        .filter(([guildId, config]) =>
            guild ? guild.id === guildId : config.guide
        )
        .map(([, config]) => {
            if (!config.guide) {
                throw new Error('missing registered guide channel.');
            }
            return client.channels.cache.get(
                config.guide
            ) as Discord.TextChannel;
        })
        .filter(channelId => channelId);
    const [guides, battlefields, emojiList] = await Promise.all([
        cache(database, 'decks_guide') as Promise<DeckGuide[]>,
        cache(database, 'wiki/battlefield') as Promise<Battlefield[]>,
        cache(database, 'discord_bot/emoji') as Promise<EmojiList>,
    ]);
    const embeds = (
        await Promise.all(
            guides
                .filter(guide => !guide.archived)
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
        .map((parsedData): Discord.MessageEmbed | Discord.MessageEmbed[] => {
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
            return fields.length > 16
                ? [
                      new Discord.MessageEmbed()
                          .setTitle(`${parsedData.name} (${parsedData.type})`)
                          .setAuthor(
                              'Random Dice Community Website',
                              'https://randomdice.gg/android-chrome-512x512.png',
                              'https://randomdice.gg/'
                          )
                          .setColor('#6ba4a5')
                          .setURL(
                              `https://randomdice.gg/decks/guide/${encodeURI(
                                  parsedData.name
                              )}`
                          )
                          .addFields(fields.slice(0, 16)),
                      new Discord.MessageEmbed()
                          .setColor('#6ba4a5')
                          .addFields(fields.slice(16))
                          .setFooter(
                              'randomdice.gg Decks Guide',
                              'https://randomdice.gg/android-chrome-512x512.png'
                          ),
                  ]
                : new Discord.MessageEmbed()
                      .setTitle(`${parsedData.name} (${parsedData.type})`)
                      .setAuthor(
                          'Random Dice Community Website',
                          'https://randomdice.gg/android-chrome-512x512.png',
                          'https://randomdice.gg/'
                      )
                      .setColor('#6ba4a5')
                      .setURL(
                          `https://randomdice.gg/decks/guide/${encodeURI(
                              parsedData.name
                          )}`
                      )
                      .addFields(fields)
                      .setFooter(
                          'randomdice.gg Decks Guide',
                          'https://randomdice.gg/android-chrome-512x512.png'
                      );
        })
        .flat();
    await Promise.all(
        registeredChannels.map(async channel => {
            const channelPermission = channel.permissionsFor(
                client.user as Discord.ClientUser
            );
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage = !channelPermission?.has(
                'MANAGE_MESSAGES'
            );
            if (cantSendMessage || cantDeleteMessage) {
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
                    return;
                }
            }
            const fetched = (
                await channel.messages.fetch({ limit: 100 })
            ).filter(message => message.author.id === client.user?.id);
            await channel.bulkDelete(fetched);
            await Promise.all(embeds.map(async embed => channel.send(embed)));
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
    const registeredChannels = (Object.entries(registeredGuilds) as [
        string,
        { news?: string }
    ][])
        .filter(([guildId, config]) =>
            guild ? guild.id === guildId : config.news
        )
        .map(([, config]) => {
            if (!config.news) {
                throw new Error('missing registered news channel.');
            }
            return client.channels.cache.get(
                config.news
            ) as Discord.TextChannel;
        })
        .filter(channelId => channelId);
    const data = (await cache(database, 'news')) as News;

    let news = parsedText(data.game);
    const imgUrl = news.match(/{img}((?!.*{img}).*){\/img}/)?.[1];
    news = news.replace(/{img}((?!.*{img}).*){\/img}/g, '');

    let embed = new Discord.MessageEmbed()
        .setColor('#6ba4a5')
        .setTitle('Random Dice news')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setURL('https://randomdice.gg/')
        .setDescription(news)
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
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage = !channelPermission?.has(
                'MANAGE_MESSAGES'
            );
            if (cantSendMessage || cantDeleteMessage) {
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
                    return;
                }
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
            await postGuide(client, database, guild);
            try {
                await statusMessage.edit(`Finished Posting ${type}`);
            } catch (err) {
                if (err.message === 'Unknown Message') {
                    await channel.send(`Finished Posting ${type}`);
                    return;
                }
                throw err;
            }
            return;
        case 'news':
            await postNews(client, database, guild);
            try {
                await statusMessage.edit(`Finished Posting ${type}`);
            } catch (err) {
                if (err.message === 'Unknown Message') {
                    await channel.send(`Finished Posting ${type}`);
                    return;
                }
                throw err;
            }
            return;
        default:
            try {
                await statusMessage.edit(
                    `\`${type}\` is not a valid type, supported type: \`guide\` \`news\``
                );
            } catch (err) {
                if (err.message === 'Unknown Message') {
                    await channel.send(
                        `\`${type}\` is not a valid type, supported type: \`guide\` \`news\``
                    );
                    return;
                }
                throw err;
            }
    }
}
