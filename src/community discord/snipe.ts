import axios from 'axios';
import { isCommunityDiscord } from 'config/guild';
import { tier2RoleIds, tier3RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    BufferResolvable,
    ButtonInteraction,
    CommandInteraction,
    GuildTextBasedChannel,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    PartialMessage,
    User,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { suppressUnknownMessage } from 'util/suppressErrors';
import checkPermission from './util/checkPermissions';

const snipeStore = {
    snipe: new Map<
        GuildTextBasedChannel,
        {
            message: Message;
            attachments: {
                attachment: BufferResolvable;
                name?: string;
            }[];
        }[]
    >(),
    editsnipe: new Map<
        GuildTextBasedChannel,
        {
            message: Message;
            attachments: {
                attachment: BufferResolvable;
                name?: string;
            }[];
        }[]
    >(),
};

const sentSnipedMessage = new Map<
    Message,
    {
        snipedMember: User;
        commandName: 'snipe' | 'editsnipe';
    }
>();

export async function snipeListener(
    type: 'edit' | 'delete',
    message: Message | PartialMessage
): Promise<void> {
    if (message.partial) {
        if (type === 'delete') {
            return;
        }
        // eslint-disable-next-line no-param-reassign
        message = await message.fetch();
    }
    if (!message.inGuild()) return;

    const { guild, channel, author } = message;

    if (!isCommunityDiscord(guild) || author.bot) {
        return;
    }

    const attachments: {
        attachment: BufferResolvable;
        name?: string;
    }[] = [];
    if (type === 'delete') {
        await Promise.all(
            message.attachments.map(async attachment => {
                const response = await axios.get(attachment.url, {
                    responseType: 'arraybuffer',
                });
                attachments.push({
                    attachment: response.data,
                    name: attachment.name || undefined,
                });
            })
        );
        snipeStore.snipe.set(channel, [
            { message, attachments },
            ...(snipeStore.snipe.get(channel) || []),
        ]);
    } else {
        snipeStore.editsnipe.set(channel, [
            { message, attachments: [] },
            ...(snipeStore.editsnipe.get(channel) || []),
        ]);
    }
}

export default async function snipe(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const { member, channel, options } = interaction;
    const commandName = interaction.commandName as 'snipe' | 'editsnipe';

    if (
        !channel ||
        (await cooldown(interaction, {
            default: 10 * 1000,
            donator: 2 * 1000,
        }))
    ) {
        return;
    }

    if (!(await checkPermission(interaction, ...tier2RoleIds))) return;

    const snipeIndex = (options.getInteger('index') ?? 1) - 1;

    if (snipeIndex && !tier3RoleIds.some(id => member.roles.cache.has(id))) {
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle(
                        `You cannot use enhanced \`/${commandName}\` with snipe index.`
                    )
                    .setColor('#ff0000')
                    .setDescription(
                        `${
                            'To use enhanced snipe to snipe with index\n' +
                            'You need one of the following roles to use this command.\n'
                        }${tier3RoleIds.map(id => `<@&${id}>`).join(' ')}`
                    ),
            ],
        });
        return;
    }

    const snipedList = snipeStore[commandName].get(channel);

    if (!snipedList?.length) {
        await interaction.reply("There's nothing to snipe here");
        return;
    }
    const snipeIndexTooBig = typeof snipedList[snipeIndex] === 'undefined';
    const sniped = snipeIndexTooBig ? snipedList[0] : snipedList[snipeIndex];
    const [snipedMessage, snipedAttachments] = [
        sniped.message,
        sniped.attachments,
    ];

    let embed = new MessageEmbed()
        .setAuthor({
            name: snipedMessage.author.tag,
            iconURL: (
                snipedMessage.member ?? snipedMessage.author
            ).displayAvatarURL({
                dynamic: true,
            }),
        })
        .setDescription(snipedMessage.content)
        .setFooter({
            text: `Message sniped by: ${member.user.tag}`,
        })
        .setTimestamp(snipedMessage.createdAt);

    if (
        snipedMessage.member &&
        snipedMessage.member.displayHexColor !== '#000000'
    ) {
        embed = embed.setColor(snipedMessage.member?.displayHexColor);
    }

    if (snipedAttachments.length) {
        embed.addField(
            `With Attachment${snipedAttachments.length > 1 ? 's' : ''}`,
            snipedAttachments.map(attachment => attachment.name).join('\n')
        );
    }

    embed = embed.addField(
        'Actions',
        '❌ Press this button to delete this message\n🗑️ Press this button to permanently delete this message from the snipe list.'
    );

    const sentSnipe = await interaction.reply({
        fetchReply: true,
        content: snipeIndexTooBig
            ? `The snipe index ${snipeIndex + 1} is too big, there are only ${
                  snipedList.length
              } of messages to be sniped, sniping the most recent message instead.`
            : undefined,
        embeds: [embed],
        files: snipedAttachments,
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setEmoji('❌')
                    .setCustomId('delete-snipe')
                    .setLabel('Delete')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setEmoji('🗑️')
                    .setCustomId('trash-snipe')
                    .setLabel('Trash')
                    .setStyle('DANGER'),
            ]),
        ],
    });

    sentSnipedMessage.set(sentSnipe, {
        snipedMember: snipedMessage.author,
        commandName,
    });
}

export async function deleteSnipe(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const { channel, member, message, user, customId } = interaction;

    if (!channel) return;

    const userCanManageMessage = !!member
        ?.permissionsIn(channel)
        .has('MANAGE_MESSAGES');

    const snipedMessage = sentSnipedMessage.get(message);

    const userIsSnipedMessageAuthor = user === snipedMessage?.snipedMember;
    const userIsInteractionTrigger = user === message.interaction?.user;

    if (!snipedMessage && !userCanManageMessage && !userIsInteractionTrigger) {
        await interaction.reply(
            'This message is too old to be deleted with buttons, please contact a moderator if you need to delete this message.'
        );
        return;
    }

    switch (customId) {
        case 'delete-snipe':
            if (
                !userIsSnipedMessageAuthor &&
                !userIsInteractionTrigger &&
                !userCanManageMessage
            ) {
                await interaction.reply({
                    content:
                        'You do not have permission to delete this message.',
                    ephemeral: true,
                });
                return;
            }
            await message.delete().catch(suppressUnknownMessage);
            break;
        case 'trash-snipe':
            if (!userIsSnipedMessageAuthor && !userCanManageMessage) {
                await interaction.reply({
                    content:
                        'You do not have permission to clear this message from snipe list.',
                    ephemeral: true,
                });
                return;
            }
            await message.delete().catch(suppressUnknownMessage);
            if (!snipedMessage) return;
            snipeStore[snipedMessage.commandName].set(
                channel,
                snipeStore[snipedMessage.commandName]
                    .get(channel)
                    ?.filter(
                        ({ message: snipedStoreMessage }) =>
                            snipedStoreMessage.id !== message.id
                    ) ?? []
            );
            await channel.send(
                `${member}, sniped message removed from snipe list.`
            );
            break;
        default:
    }
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'snipe',
        description: 'Snipe a deleted message',
        options: [
            {
                name: 'index',
                type: 'INTEGER',
                description: 'The index of the deleted message stored to snipe',
            },
        ],
    },
    {
        name: 'editsnipe',
        description: 'Snipe an edited message',
        options: [
            {
                name: 'index',
                type: 'INTEGER',
                description: 'The index of the edited message stored to snipe',
            },
        ],
    },
];
