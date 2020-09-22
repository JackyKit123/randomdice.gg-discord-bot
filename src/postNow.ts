import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as textVersion from 'textversionjs';
import * as diceEmoji from '../config/diceEmoji.json';

export default async function postNow(
    message: Discord.Message,
    client: Discord.Client,
    database: admin.database.Database
) {
    const type = message.content.split(' ')[2];
    const {member, guild} = message;
    if (!member || !guild) {
        return;
    }
    try {
        if (!member.hasPermission('MANAGE_MESSAGES')) {
            await message.reply(
                'you lack permission to execute this command, required permission: `MANAGE_MESSAGES`'
            );
            return;
        }

        switch (type) {
            case 'guide':
                await postGuide(client, database, guild);
                return;
            default:
                await message.reply(
                    'target type not found, supported type: `guide`'
                );
                return;
        }
    } catch (err) {
        throw err;
    }
}

export async function postGuide(
    client: Discord.Client,
    database: admin.database.Database,
    guild?: Discord.Guild
) {
    try {
        const registeredGuilds = (
            await database.ref('/discord_bot').once('value')
        ).val();
        const registeredChannels = Object.entries(registeredGuilds)
            .filter(([guildId]) => (guild ? guild.id === guildId : true))
            .map(
                ([guildId, config]) =>
                    client.channels.cache.get(
                        (config as {guide: string}).guide
                    ) as Discord.TextChannel
            )
            .filter((channelId) => channelId);
        const data = (
            await database.ref('/decks_guide').once('value')
        ).val() as {
            id: number;
            name: string;
            type: string;
            guide: string;
            diceList: number[][];
        }[];
        const embeds = data
            .map((guide) => {
                const title = guide.name;
                const type = guide.type;
                const diceList = guide.diceList.map((list) =>
                    list.map((die) => 
                        (diceEmoji as {[key: number]: string})[die]
                    )
                );
                const paragraph = textVersion(guide.guide, {
                    linkProcess: (href, linkText) => linkText,
                }).split('\n');
                return {
                    title,
                    type,
                    diceList,
                    paragraph,
                };
            })
            .map((data): Discord.MessageEmbed | Discord.MessageEmbed[] => {
                const fields = [
                    ...data.diceList.map((list, i) => ({
                        name: i === 0 ? 'Guide' : '⠀',
                        value: list.join(' '),
                    })),
                    ...data.paragraph
                        .filter((p) => p !== '')
                        .map((p, i) => ({
                            name: i === 0 ? 'Guide' : '⠀',
                            value: p,
                        })),
                ];
                return fields.length > 16
                    ? [
                          new Discord.MessageEmbed()
                              .setTitle(`${data.title} (${data.type})`)
                              .setAuthor(
                                  'Random Dice Community Website',
                                  'https://randomdice.gg/title_dice.png',
                                  'https://randomdice.gg/'
                              )
                              .setColor('#6ba4a5')
                              .setURL(
                                  `https://randomdice.gg/decks/guide/${encodeURI(
                                      data.title
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
                          .setTitle(`${data.title} (${data.type})`)
                          .setAuthor(
                              'Random Dice Community Website',
                              'https://randomdice.gg/title_dice.png',
                              'https://randomdice.gg/'
                          )
                          .setColor('#6ba4a5')
                          .setURL(
                              `https://randomdice.gg/decks/guide/${encodeURI(
                                  data.title
                              )}`
                          )
                          .addFields(fields)
                          .setFooter(
                              'randomdice.gg Decks Guide',
                              'https://randomdice.gg/title_dice.png'
                          );
            })
            .flat();
        registeredChannels.forEach(async (channel) => {
            try {
                const fetched = await (
                    await channel.messages.fetch({limit: 100})
                ).filter(
                    (message) => message.author.id === '723917706641801316'
                );
                await channel.bulkDelete(fetched);
                await embeds.forEach(async (embed) => {
                    try {
                        await channel.send(embed);
                    } catch (err) {
                        console.error(err);
                    }
                });
            } catch (err) {
                throw err;
            }
        });
    } catch (err) {
        throw err;
    }
}
