// eslint-disable-next-line
import Discord, {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    DiscordAPIError,
    Message,
    MessageEmbed,
} from 'discord.js';
import firebase from 'firebase-admin';
import { database } from 'register/firebase';
import cache from 'util/cache';
import logMessage from 'dev-commands/logMessage';
import cooldown from 'util/cooldown';
import { edit, reply } from 'util/typesafeReply';
import { getNewsInfo } from './news';
import { getGuideData } from './guide';
import getBrandingEmbed from './util/getBrandingEmbed';

export async function postGuide(
    client: Discord.Client,
    member?: Discord.GuildMember,
    updateListener?: {
        snapshot: firebase.database.DataSnapshot;
        event: 'added' | 'updated' | 'removed';
    }
): Promise<void> {
    const registeredGuilds = cache['discord_bot/registry'];
    const registeredChannels = (
        await Promise.all(
            (Object.entries(registeredGuilds) as [string, { guide?: string }][])
                .filter(([guildId, config]) =>
                    member ? member.guild.id === guildId : config.guide
                )
                .map(async ([guildId, config]) => {
                    if (!config.guide) {
                        throw new Error('missing registered guide channel.');
                    }
                    try {
                        const guideChannel = await client.channels.fetch(
                            config.guide
                        );

                        if (!guideChannel?.isText())
                            throw new Error('Unknown Channel');
                        return guideChannel;
                    } catch (err) {
                        if (
                            ['Unknown Channel', 'Missing Access'].includes(
                                (err as DiscordAPIError | Error).message
                            )
                        ) {
                            database
                                .ref('discord_bot/registry')
                                .child(guildId)
                                .child('guide')
                                .set(null);
                            return undefined;
                        }
                        throw err;
                    }
                })
        )
    ).filter(channel => channel) as Discord.TextChannel[];
    const guides = cache.decks_guide;

    const embeds = ['PvP', 'Co-op', 'Crew']
        .flatMap(type =>
            guides.filter(guide => guide.type === type && !guide.archived)
        )
        .flatMap(
            guide => (getGuideData(guide) as { embeds: MessageEmbed[] }).embeds
        );
    await Promise.all(
        registeredChannels.map(async channel => {
            const channelPermission = channel.permissionsFor(
                client.user as Discord.ClientUser
            );
            const cantViewChannel = !channelPermission?.has('VIEW_CHANNEL');
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage =
                !channelPermission?.has('MANAGE_MESSAGES');
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
                await database
                    .ref('discord_bot/registry')
                    .child(channel.guild.id)
                    .child('guide')
                    .set(null);
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
            const statusMessage = await channel.send({
                embeds: [
                    getBrandingEmbed()
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
                        .setDescription(`Requested By: ${member?.toString()}`),
                ],
            });
            const messageIds = (
                await Promise.all(
                    embeds.map(async embed => {
                        if (embed.footer) {
                            const existFieldIndex = embed.fields.findIndex(
                                field => field.name === 'Finished Reading?'
                            );
                            if (existFieldIndex > -1) {
                                // eslint-disable-next-line no-param-reassign
                                embed.fields[
                                    existFieldIndex
                                ].value = `[Click Here to navigate back to the top.](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${statusMessage.id})`;
                            } else {
                                embed
                                    .addField('‎', '‎')
                                    .addField(
                                        'Finished Reading?',
                                        `[Click Here to navigate back to the top.](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${statusMessage.id})`
                                    );
                            }
                        }
                        const { id } = await channel.send({ embeds: [embed] });
                        return {
                            isTitle: !!embed.title,
                            isUpdated:
                                (embed.title?.replace(
                                    / \((?:PvP|Co-op|Crew)\)$/,
                                    ''
                                ) || '') ===
                                updateListener?.snapshot.val().name,
                            id,
                        };
                    })
                )
            ).filter(msg => msg.isTitle);
            const guideListEmbed = getBrandingEmbed('/decks/guide')
                .setTimestamp()
                .setTitle('Deck Guide List')
                .setDescription(
                    'Click on the url for quick navigation to a guide'
                )
                .addFields(
                    ['PvP', 'Co-op', 'Crew']
                        .flatMap(type =>
                            guides.filter(
                                guide => guide.type === type && !guide.archived
                            )
                        )
                        .map((guide, i) => ({
                            name: `${guide.name} (${guide.type})`,
                            value: `[Click here to jump](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${messageIds[i]?.id})`,
                        }))
                );
            try {
                await statusMessage.edit({ embeds: [guideListEmbed] });
            } catch {
                if (!statusMessage.editedAt)
                    await channel.send({ embeds: [guideListEmbed] });
            }

            await channel.send({
                embeds: [
                    getBrandingEmbed()
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
                            updateListener?.event === 'added' ||
                                updateListener?.event === 'updated'
                                ? `Navigate to the update guide by [clicking here](https://discordapp.com/channels/${
                                      channel.guild.id
                                  }/${channel.id}/${
                                      messageIds.find(id => id.isUpdated)?.id ||
                                      statusMessage.id
                                  }).`
                                : `Navigate to the list of guides for quick navigation by [clicking here](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${statusMessage.id}).`
                        )
                        .setFooter({
                            text: updateListener
                                ? 'Last Updated Timestamp'
                                : `Requested by ${member?.user.username}#${member?.user.discriminator}`,
                            iconURL:
                                member?.avatarURL({ dynamic: true }) ??
                                'https://firebasestorage.googleapis.com/v0/b/random-dice-web.appspot.com/o/Dice%20Images%2FTime?alt=media&token=5c459fc5-4059-4099-b93d-f4bc86debf6d',
                        }),
                ],
            });
        })
    );
}

export async function postNews(
    client: Discord.Client,
    guild?: Discord.Guild
): Promise<void> {
    const registeredGuilds = cache['discord_bot/registry'];
    const registeredChannels = (
        await Promise.all(
            (Object.entries(registeredGuilds) as [string, { news?: string }][])
                .filter(([guildId, config]) =>
                    guild ? guild.id === guildId : config.news
                )
                .map(async ([guildId, config]) => {
                    if (!config.news) {
                        throw new Error('missing registered news channel.');
                    }
                    try {
                        const guideChannel = await client.channels.fetch(
                            config.news
                        );

                        if (!guideChannel?.isText())
                            throw new Error('Unknown Channel');
                        return guideChannel;
                    } catch (err) {
                        if (
                            ['Unknown Channel', 'Missing Access'].includes(
                                (err as DiscordAPIError | Error).message
                            )
                        ) {
                            database
                                .ref('discord_bot/registry')
                                .child(guildId)
                                .child('news')
                                .set(null);
                            return undefined;
                        }
                        throw err;
                    }
                })
        )
    ).filter(channel => channel) as Discord.TextChannel[];

    const { ytUrl, embed } = getNewsInfo();

    await Promise.all(
        registeredChannels.map(async channel => {
            const channelPermission = channel.permissionsFor(
                client.user as Discord.ClientUser
            );
            const cantViewChannel = !channelPermission?.has('VIEW_CHANNEL');
            const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
            const cantDeleteMessage =
                !channelPermission?.has('MANAGE_MESSAGES');
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
                await database
                    .ref('discord_bot/registry')
                    .child(channel.guild.id)
                    .child('news')
                    .set(null);
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
            await channel.send({ embeds: [embed] });
            if (ytUrl) {
                await channel.send(ytUrl);
            }
        })
    );
}

export default async function postNow(
    input: Message | CommandInteraction,
    typeArg?: string
): Promise<void> {
    const { member, guild, client } = input;
    if (!member || !guild) {
        return;
    }

    if (
        await cooldown(input, '.gg postnow', {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_MESSAGES')
    ) {
        await reply(input, {
            content:
                'you lack permission to execute this command, required permission: `MANAGE_MESSAGES`',
            components: [],
        });
        return;
    }

    // eslint-disable-next-line no-param-reassign
    const type =
        typeArg ??
        (input instanceof Message
            ? input.content.split(' ')[2]
            : input.options.getString('type') ?? '');
    if (!type) {
        await reply(
            input,
            `Usage of the command: \`\`\`.gg postnow <guide|news>\`\`\``
        );
        return;
    }

    if (type === 'guide' || type === 'news') {
        const statusMessage = await (typeArg ? edit : reply)(input, {
            content: `Now posting ${type}...`,
            components: [],
        });

        try {
            if (type === 'guide') {
                await postGuide(
                    client,
                    guild.members.cache.get(member.user.id)
                );
            } else if (type === 'news') {
                await postNews(client, guild);
            }
        } catch {
            // do nothing
        } finally {
            await edit(
                input instanceof Message ? statusMessage : input,
                `Finished Posting ${type}`
            );
        }
        return;
    }

    await reply(input, {
        content: `\`${type}\` is not a valid type, supported type: \`guide\` \`news\``,
        components: [],
    });
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'post-now',
    description: 'Posts the latest news or guide to the registered channels',
    options: [
        {
            type: 3,
            name: 'type',
            description: 'The type of post to post, either `guide` or `news`',
            required: true,
            choices: [
                {
                    name: 'guide',
                    value: 'guide',
                },

                {
                    name: 'news',
                    value: 'news',
                },
            ],
        },
    ],
};
