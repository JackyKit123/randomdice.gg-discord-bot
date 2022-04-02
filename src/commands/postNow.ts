import {
    ApplicationCommandDataResolvable,
    ButtonInteraction,
    Client,
    CommandInteraction,
    Guild,
    GuildMember,
    MessageEmbed,
} from 'discord.js';
import firebase from 'firebase-admin';
import { database } from 'register/firebase';
import cache, { Registry } from 'util/cache';
import logMessage from 'util/logMessage';
import cooldown from 'util/cooldown';
import {
    suppressMissingAccess,
    suppressUnknownChannel,
    suppressUnknownMessage,
} from 'util/suppressErrors';
import { getTimeDiceEmoji } from 'config/emojiId';
import getMessageLink from 'util/getMessageLink';
import { getNewsInfo } from './news';
import { getGuideData } from './guide';
import getBrandingEmbed from './util/getBrandingEmbed';

async function getChannel(
    client: Client,
    config: Registry['key'],
    type: 'news' | 'guide',
    guildId: string
) {
    const { channels, user: clientUser } = client;
    if (!clientUser) return null;

    const removeFromDatabaseRegistry = async () => {
        await database
            .ref('discord_bot/registry')
            .child(guildId)
            .child(type)
            .set(null);
        return null;
    };
    const channelId = config[type];

    if (!channelId) return removeFromDatabaseRegistry();

    const channel = await channels
        .fetch(channelId)
        .catch(suppressUnknownChannel)
        .catch(suppressMissingAccess);

    if (!(channel?.type === 'GUILD_TEXT' || channel?.type === 'GUILD_NEWS'))
        return removeFromDatabaseRegistry();

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
        return removeFromDatabaseRegistry();
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
            guide =>
                (getGuideData(guide, true) as { embeds: MessageEmbed[] }).embeds
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
                                ].value = `[Click Here to navigate back to the top.](${statusMessage.url})`;
                            } else {
                                embed
                                    .addField('‎', '‎')
                                    .addField(
                                        'Finished Reading?',
                                        `[Click Here to navigate back to the top.](${statusMessage.url})`
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
                            value: `[Click here to jump](${getMessageLink(
                                channel,
                                messageIds[i].id
                            )})`,
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
                                : `Last Updated: \`/postnow guide\` is executed. Manual requested refresh.`
                        )
                        .setDescription(
                            updateListener?.event === 'added' ||
                                updateListener?.event === 'updated'
                                ? `Navigate to the update guide by [clicking here](${getMessageLink(
                                      channel,
                                      messageIds.find(id => id.isUpdated)?.id ||
                                          statusMessage.id
                                  )}).`
                                : `Navigate to the list of guides for quick navigation by [clicking here](${statusMessage.url}).`
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

            const channel = await getChannel(client, config, 'news', guildId);
            if (!channel) return;

            await channel.send({ embeds: [embed] });
            if (ytUrl) {
                await channel.send(ytUrl);
            }
        })
    );
}

export default async function postNow(
    interaction: CommandInteraction | ButtonInteraction,
    typeArg?: 'guide' | 'news'
): Promise<void> {
    if (!interaction.inCachedGuild()) {
        await interaction.reply('This command is only available in guilds.');
        return;
    }
    const { member, guild, client } = interaction;

    if (
        await cooldown(
            interaction,
            {
                default: 60 * 1000,
                donator: 10 * 1000,
            },
            'post-now'
        )
    ) {
        return;
    }

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_MESSAGES')
    ) {
        await interaction.reply(
            'you lack permission to execute this command, required permission: `MANAGE_MESSAGES`'
        );
        return;
    }

    const type = (
        interaction instanceof ButtonInteraction
            ? typeArg
            : interaction.options.getString('type', true)
    ) as 'guide' | 'news';

    if (interaction.replied) {
        await interaction.editReply({
            content: `Now posting ${type}...`,
            components: [],
        });
    } else {
        await interaction.reply(`Now posting ${type}...`);
    }

    if (type === 'guide') {
        await postGuide(client, guild.members.cache.get(member.user.id));
    }
    if (type === 'news') {
        await postNews(client, guild);
    }

    await interaction.editReply(`Finished Posting ${type}`);
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'post-now',
    description: 'Posts the latest news or guide to the registered channels',
    options: [
        {
            type: 'STRING',
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
