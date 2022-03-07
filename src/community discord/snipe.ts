import axios from 'axios';
import { tier2RoleIds, tier3RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    BufferResolvable,
    CommandInteraction,
    GuildChannelResolvable,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    PartialMessage,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import checkPermission from './util/checkPermissions';

const snipeStore = {
    snipe: new Map<
        string,
        {
            message: Message;
            attachments: {
                attachment: BufferResolvable;
                name?: string;
            }[];
        }[]
    >(),
    editsnipe: new Map<
        string,
        {
            message: Message;
            attachments: {
                attachment: BufferResolvable;
                name?: string;
            }[];
        }[]
    >(),
};

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

    const { guild, channel, author } = message;

    if (guild?.id !== process.env.COMMUNITY_SERVER_ID || author.bot) {
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
        snipeStore.snipe.set(channel.id, [
            { message, attachments },
            ...(snipeStore.snipe.get(channel.id) || []),
        ]);
    } else {
        snipeStore.editsnipe.set(channel.id, [
            { message, attachments: [] },
            ...(snipeStore.editsnipe.get(channel.id) || []),
        ]);
    }
}

export default async function snipe(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild, channel } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');
    const [command, arg] =
        input instanceof Message
            ? input.content.split(' ')
            : [input.commandName, input.options.getInteger('index')];

    if (
        !guild ||
        !member ||
        !channel ||
        (await cooldown(input, '!snipe', {
            default: 10 * 1000,
            donator: 2 * 1000,
        }))
    ) {
        return;
    }

    if (!(await checkPermission(input, ...tier2RoleIds))) return;

    let snipeIndex = 0;
    if (
        !Number.isNaN(arg) &&
        Number.isInteger(Number(arg)) &&
        Number(arg) > 0
    ) {
        snipeIndex = Number(arg) - 1;
    }

    if (snipeIndex && !tier3RoleIds.some(id => member.roles.cache.has(id))) {
        await reply(input, {
            embeds: [
                new MessageEmbed()
                    .setTitle(
                        `You cannot use enhanced ${command?.toLowerCase()} with snipe index.`
                    )
                    .setColor('#ff0000')
                    .setDescription(
                        'To use enhanced snipe to snipe with index\n' +
                            'You need one of the following roles to use this command.\n' +
                            '<@&804512584375599154> <@&809142956715671572>\n'
                    ),
            ],
        });
        return;
    }

    const snipedList = snipeStore[
        command?.toLowerCase().replace('!', '') as 'snipe' | 'editsnipe'
    ].get(channel.id);

    if (!snipedList?.length) {
        await reply(input, "There's nothing to snipe here");
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
            text: `snipedMessage by: ${member.user.tag}`,
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

    const messageOption = {
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
                    .setCustomId('Delete')
                    .setLabel('Delete')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setEmoji('🗑️')
                    .setCustomId('Trash')
                    .setLabel('Trash')
                    .setStyle('DANGER'),
            ]),
        ],
    };

    const sentSnipe = await reply(input, messageOption);

    sentSnipe
        .createMessageComponentCollector()
        .on('collect', async interaction => {
            if (!interaction.isButton()) return;
            const userCanManageMessage = !!guild.members.cache
                .get(interaction.user.id)
                ?.permissionsIn(channel as GuildChannelResolvable)
                .has('MANAGE_MESSAGES');
            const userIsSnipedMessageAuthor =
                interaction.user.id === snipedMessage.author.id;
            const userIsInteractionTrigger =
                interaction.user.id === member.user.id;

            switch (interaction.customId) {
                case '❌':
                    if (
                        !userCanManageMessage &&
                        !userIsSnipedMessageAuthor &&
                        !userIsInteractionTrigger
                    ) {
                        await interaction.reply({
                            content:
                                'You do not have permission to delete this message.',
                            ephemeral: true,
                        });
                        return;
                    }
                    await (input instanceof Message
                        ? sentSnipe.delete()
                        : input.deleteReply());
                    break;
                case '🗑️':
                    if (!userCanManageMessage && !userIsSnipedMessageAuthor) {
                        await interaction.reply({
                            content:
                                'You do not have permission to clear this message from snipe list.',
                            ephemeral: true,
                        });
                        return;
                    }
                    await (input instanceof Message
                        ? sentSnipe.delete()
                        : input.deleteReply());
                    snipeStore[
                        command?.toLowerCase().replace('!', '') as
                            | 'snipe'
                            | 'editsnipe'
                    ].set(
                        channel.id,
                        snipeStore[
                            command?.toLowerCase().replace('!', '') as
                                | 'snipe'
                                | 'editsnipe'
                        ]
                            .get(channel.id)
                            ?.filter(
                                ({ message: snipedStoreMessage }) =>
                                    snipedStoreMessage.id !== snipedMessage.id
                            ) ?? []
                    );
                    await channel.send(
                        `${interaction.user}, sniped message removed from snipe list.`
                    );
                    break;
                default:
            }
        })
        .on('end', async () => {
            messageOption.components = [];
            if (sentSnipe.editable) {
                await sentSnipe.edit(messageOption);
            }
        });
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'snipe',
        description: 'Snipe a deleted message',
        options: [
            {
                name: 'index',
                type: 3,
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
                type: 3,
                description: 'The index of the edited message stored to snipe',
            },
        ],
    },
];
