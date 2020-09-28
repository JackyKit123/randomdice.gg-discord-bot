import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { News, DeckGuide, Registry, EmojiList } from '../helper/cache';
import parsedText from '../helper/parseText';

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
    const data = (await cache(database, 'decks_guide')) as DeckGuide[];
    const embeds = await (
        await Promise.all(
            data
                .filter(guide => !guide.archived)
                .map(async guide => {
                    const { type, name } = guide;
                    const diceList = await Promise.all(
                        guide.diceList.map(async list =>
                            Promise.all(
                                list.map(
                                    async die =>
                                        ((await cache(
                                            database,
                                            'discord_bot/emoji'
                                        )) as EmojiList)[die]
                                )
                            )
                        )
                    );
                    const paragraph = parsedText(guide.guide).split('\n');
                    return {
                        name,
                        type,
                        diceList,
                        paragraph,
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
                              'https://randomdice.gg/title_dice.png',
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
                              'https://randomdice.gg/title_dice.png'
                          ),
                  ]
                : new Discord.MessageEmbed()
                      .setTitle(`${parsedData.name} (${parsedData.type})`)
                      .setAuthor(
                          'Random Dice Community Website',
                          'https://randomdice.gg/title_dice.png',
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
                          'https://randomdice.gg/title_dice.png'
                      );
        })
        .flat();
    await Promise.all(
        registeredChannels.map(async channel => {
            const fetched = (
                await channel.messages.fetch({ limit: 100 })
            ).filter(message => message.author.id === client.user?.id);
            await channel.bulkDelete(fetched);
            return Promise.all(embeds.map(async embed => channel.send(embed)));
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

    const news = parsedText(data.game).split('\n');

    const fields = news
        .filter(p => p !== '')
        .map((p, i) => ({
            name: i === 0 ? 'News' : '⠀',
            value: p,
        }));

    const embeds = new Array(Math.ceil(news.length / 16))
        .fill('')
        .map((_, i) => {
            switch (Math.ceil(news.length / 16)) {
                case 1:
                    return [
                        new Discord.MessageEmbed()
                            .setColor('#6ba4a5')
                            .setTitle('Random Dice news')
                            .setAuthor(
                                'Random Dice Community Website',
                                'https://randomdice.gg/title_dice.png',
                                'https://randomdice.gg/'
                            )
                            .setURL('https://randomdice.gg/')
                            .addFields(fields)
                            .setFooter(
                                'randomdice.gg News Update',
                                'https://randomdice.gg/title_dice.png'
                            ),
                    ];
                case 2: {
                    return i === 0
                        ? new Discord.MessageEmbed()
                              .setColor('#6ba4a5')
                              .setTitle('Random Dice news')
                              .setAuthor(
                                  'Random Dice Community Website',
                                  'https://randomdice.gg/title_dice.png',
                                  'https://randomdice.gg/'
                              )
                              .setColor('#6ba4a5')
                              .setURL('https://randomdice.gg/')
                              .addFields(fields.slice(0, 16))
                        : new Discord.MessageEmbed()
                              .setColor('#6ba4a5')
                              .setColor('#6ba4a5')
                              .addFields(fields.slice(16))
                              .setFooter(
                                  'randomdice.gg News Update',
                                  'https://randomdice.gg/title_dice.png'
                              );
                }
                default: {
                    if (i === 0) {
                        return new Discord.MessageEmbed()
                            .setColor('#6ba4a5')
                            .setTitle('Random Dice news')
                            .setAuthor(
                                'Random Dice Community Website',
                                'https://randomdice.gg/title_dice.png',
                                'https://randomdice.gg/'
                            )
                            .setURL('https://randomdice.gg/')
                            .addFields(fields.slice(0, 16));
                    }
                    if (i === Math.ceil(news.length / 16)) {
                        return new Discord.MessageEmbed()
                            .setColor('#6ba4a5')
                            .addFields(fields.slice(16 * i))
                            .setFooter(
                                'randomdice.gg News Update',
                                'https://randomdice.gg/title_dice.png'
                            );
                    }
                    return new Discord.MessageEmbed()
                        .setColor('#6ba4a5')
                        .addFields(fields.slice(16 * i, 16 * (i + 1)));
                }
            }
        });

    await Promise.all(
        registeredChannels.map(async channel => {
            const fetched = (
                await channel.messages.fetch({ limit: 10 })
            ).filter(message => message.author.id === client.user?.id);
            await channel.bulkDelete(fetched);
            return Promise.all(embeds.map(async embed => channel.send(embed)));
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
            await statusMessage.edit(`Finished Posting ${type}`);
            return;
        case 'news':
            await postNews(client, database, guild);
            await statusMessage.edit(`Finished Posting ${type}`);
            return;
        default:
            await statusMessage.edit(
                'Target type not found, supported type: `guide` `news`'
            );
    }
}
