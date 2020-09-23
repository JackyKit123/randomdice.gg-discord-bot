import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as textVersion from 'textversionjs';
import cache, { News, DeckGuide, Registry, EmojiList } from './cache';

function escapeHtml(str: string): string {
    let output = str;
    const characters = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '\\>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/',
        '<i>': '*',
        '</i>': '*',
        '<b>': '**',
        '</b>': '**',
        '<strong>': '**',
        '</strong>': '**',
    };
    Object.entries(characters).forEach(([code, character]) => {
        output = output.replace(new RegExp(code, 'g'), character);
    });
    return output;
}

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
        .filter(([guildId]) => (guild ? guild.id === guildId : true))
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
            data.map(async guide => {
                const title = guide.name;
                const { type } = guide;
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
                const paragraph = textVersion(escapeHtml(guide.guide), {
                    linkProcess: (href, linkText) => linkText,
                }).split('\n');
                return {
                    title,
                    type,
                    diceList,
                    paragraph,
                };
            })
        )
    )

        .map((parsedData): Discord.MessageEmbed | Discord.MessageEmbed[] => {
            const fields = [
                ...parsedData.diceList.map((list, i) => ({
                    name: i === 0 ? 'Guide' : '⠀',
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
                          .setTitle(`${parsedData.title} (${parsedData.type})`)
                          .setAuthor(
                              'Random Dice Community Website',
                              'https://randomdice.gg/title_dice.png',
                              'https://randomdice.gg/'
                          )
                          .setColor('#6ba4a5')
                          .setURL(
                              `https://randomdice.gg/decks/guide/${encodeURI(
                                  parsedData.title
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
                      .setTitle(`${parsedData.title} (${parsedData.type})`)
                      .setAuthor(
                          'Random Dice Community Website',
                          'https://randomdice.gg/title_dice.png',
                          'https://randomdice.gg/'
                      )
                      .setColor('#6ba4a5')
                      .setURL(
                          `https://randomdice.gg/decks/guide/${encodeURI(
                              parsedData.title
                          )}`
                      )
                      .addFields(fields)
                      .setFooter(
                          'randomdice.gg Decks Guide',
                          'https://randomdice.gg/title_dice.png'
                      );
        })
        .flat();
    registeredChannels.forEach(async channel => {
        const fetched = (await channel.messages.fetch({ limit: 100 })).filter(
            message => message.author.id === client.user?.id
        );
        await channel.bulkDelete(fetched);
        embeds.forEach(async embed => {
            try {
                await channel.send(embed);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err);
            }
        });
    });
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
        .filter(([guildId]) => (guild ? guild.id === guildId : true))
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

    const news = textVersion(escapeHtml(data.game), {
        linkProcess: (href, linkText) => linkText,
    }).split('\n');

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
                            .setTitle(`Random Dice news`)
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
                              .setTitle(`Random Dice news`)
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
                            .setTitle(`Random Dice news`)
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

    registeredChannels.forEach(async channel => {
        const fetched = (await channel.messages.fetch({ limit: 10 })).filter(
            message => message.author.id === client.user?.id
        );
        await channel.bulkDelete(fetched);
        embeds.forEach(async embed => {
            try {
                await channel.send(embed);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(err);
            }
        });
    });
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

    switch (type) {
        case 'guide':
            await postGuide(client, database, guild);
            return;
        case 'news':
            await postNews(client, database, guild);
            return;
        default:
            await channel.send(
                'target type not found, supported type: `guide` `news`'
            );
    }
}
