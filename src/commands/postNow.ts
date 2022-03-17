import {
    ApplicationCommandDataResolvable,
    Client,
    CommandInteraction,
    Guild,
    GuildMember,
    Message,
    MessageEmbed,
} from 'discord.js';
import firebase from 'firebase-admin';
import { database } from 'register/firebase';
import cache, { Registry } from 'util/cache';
import logMessage from 'util/logMessage';
import cooldown from 'util/cooldown';
import { edit, reply } from 'util/typesafeReply';
import {
    suppressMissingAccess,
    suppressUnknownChannel,
    suppressUnknownMessage,
} from 'util/suppressErrors';
import { getTimeDiceEmoji } from 'config/emojiId';
import { getNewsInfo } from './news';
import { getGuideData } from './guide';
import getBrandingEmbed from './util/getBrandingEmbed';

async function getChannel(
    client: Client,
    config: Registry['key'],
    type: keyof Registry['key'],
    guildId: string
) {
    const { channels, user: clientUser } = client;
    if (!clientUser) return null;

    const channel = await channels
        .fetch(config[type])
        .catch(suppressUnknownChannel)
        .catch(suppressMissingAccess);

    if (!(channel?.type === 'GUILD_TEXT' || channel?.type === 'GUILD_NEWS')) {
        database
            .ref('discord_bot/registry')
            .child(guildId)
            .child(type)
            .set(null);
        return null;
    }

    const channelPermission = channel.permissionsFor(clientUser);
    const cantViewChannel = !channelPermission?.has('VIEW_CHANNEL');
    const cantSendMessage = !channelPermission?.has('SEND_MESSAGES');
    const cantDeleteMessage = !channelPermission?.has('MANAGE_MESSAGES');
    if (cantViewChannel || cantSendMessage || cantDeleteMessage) {
        if (cantViewChannel) {
            await logMessage(
                client,
                'info',
                `Attempted to send ${type} in channel ${channel.name} at ${channel.guild.name} but missing permission \`VIEW_CHANNEL\`.`
            );
        }
        if (cantSendMessage) {
            await logMessage(
                client,
                'info',
                `Attempted to send ${type} in channel ${channel.name} at ${channel.guild.name} but missing permission \`SEND_MESSAGES\`.`
            );
        }
        if (cantDeleteMessage) {
            await logMessage(
                client,
                'info',
                `Attempted to send ${type} in channel ${channel.name} at ${channel.guild.name} but missing permission \`MANAGE_MESSAGES\`.`
            );
        }
        await database
            .ref('discord_bot/registry')
            .child(channel.guild.id)
            .child('guide')
            .set(null);
        return null;
    }
    const fetched = (await channel.messages.fetch({ limit: 100 })).filter(
        message =>
            message.author.id === client.user?.id &&
            new Date().valueOf() - message.createdTimestamp <= 86400000 * 14
    );
    await channel.bulkDelete(fetched);
    return channel;
}
export async function postGuide(
    client: Client,
    member?: GuildMember,
    updateListener?: {
        snapshot: firebase.database.DataSnapshot;
        event: 'added' | 'updated' | 'removed';
    }
): Promise<void> {
    const registeredGuilds = cache['discord_bot/registry'];
    const guides = cache.decks_guide;

    const embeds = ['PvP', 'Co-op', 'Crew']
        .flatMap(type =>
            guides.filter(guide => guide.type === type && !guide.archived)
        )
        .flatMap(
            guide => (getGuideData(guide) as { embeds: MessageEmbed[] }).embeds
        );
    await Promise.all(
        Object.entries(registeredGuilds).map(async ([guildId, config]) => {
            if (member && member?.guild.id !== guildId) return;

            const channel = await getChannel(client, config, 'guide', guildId);
            if (!channel) return;

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
                                    : `\`postnow guide\` command is executed.`
                            } Refreshing all deck guides.`
                        )
                        .setDescription(
                            member
                                ? `Requested By: ${member.toString()}`
                                : 'Auto Refresh'
                        ),
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

            const edited = await statusMessage
                .edit({ embeds: [guideListEmbed] })
                .catch(suppressUnknownMessage);

            if (!edited) await channel.send({ embeds: [guideListEmbed] });

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
                                : `Requested by ${member?.user.tag}`,
                            iconURL:
                                member?.displayAvatarURL({ dynamic: true }) ??
                                getTimeDiceEmoji(client)?.url ??
                                undefined,
                        }),
                ],
            });
        })
    );
}

export async function postNews(client: Client, guild?: Guild): Promise<void> {
    const registeredGuilds = cache['discord_bot/registry'];
    const { ytUrl, embed } = getNewsInfo();

    await Promise.all(
        Object.entries(registeredGuilds).map(async ([guildId, config]) => {
            if (guild && guild.id !== guildId) return;

            const channel = await getChannel(client, config, 'guide', guildId);
            if (!channel) return;

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
