import {
    AnyChannel,
    ApplicationCommandData,
    ClientUser,
    CommandInteraction,
    Guild,
    GuildChannel,
    Message,
    MessageEmbed,
    TextBasedChannel,
} from 'discord.js';
import { database } from 'register/firebase';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import yesNoButton from 'util/yesNoButton';
import postNow from './postNow';
import getBrandingEmbed from './util/getBrandingEmbed';

async function checkRegistered(guild: Guild): Promise<MessageEmbed | string> {
    const registeredChannel = (
        await database.ref(`/discord_bot/registry/${guild.id}`).once('value')
    ).val();
    if (!registeredChannel) {
        return 'You have no registered channel. Start registering channel by doing `.gg register`';
    }
    return getBrandingEmbed()
        .setTitle('Registered Channels')
        .setDescription('Here is the list of registered channel for the type')
        .addFields(
            Object.entries(registeredChannel).map(([type, channelId]) => ({
                name: type,
                value: `<#${channelId}>`,
            }))
        );
}

export async function register(
    input: Message | CommandInteraction
): Promise<void> {
    const { client, member, guild } = input;

    if (
        await cooldown(input, '.gg register', {
            default: 5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }
    if (!member || !guild) {
        await reply(input, 'You can only execute this command in a server.');
        return;
    }

    let type = '';
    let channel:
        | ReturnType<CommandInteraction['options']['getChannel']>
        | AnyChannel
        | undefined = null;
    if (input instanceof Message) {
        const args = input.content.split(' ');
        [, , type] = args;
        channel =
            input.mentions.channels.first() ||
            client.channels.cache.get(args[3] || '');
    } else {
        type = input.options.getString('type') ?? '';
        channel = input.options.getChannel('channel');
    }

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_CHANNELS')
    ) {
        await reply(
            input,
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }

    const channelIsValid = (c: typeof channel): c is TextBasedChannel =>
        !!(c && guild.channels.cache.get(c.id)?.isText());

    switch (type) {
        case 'guide':
        case 'news': {
            if (!channelIsValid(channel)) {
                await reply(
                    input,
                    `Please mention a text channel that you would like to register ${type} in.`
                );
                return;
            }
            const registry = (
                await database
                    .ref(`/discord_bot/registry/${guild.id}`)
                    .once('value')
            ).val();
            const channelRegistered = Object.entries(registry || {}).find(
                ([registeredType, registeredChannelId]) =>
                    registeredChannelId === channel?.id &&
                    registeredType !== type
            );
            if (channelRegistered) {
                await reply(
                    input,
                    'You cannot register 2 categories into the same channel, please register another channel.'
                );
                return;
            }
            const missingPermissions = (channel as GuildChannel)
                .permissionsFor(client.user as ClientUser)
                ?.missing([
                    'VIEW_CHANNEL',
                    'SEND_MESSAGES',
                    'MANAGE_MESSAGES',
                    'READ_MESSAGE_HISTORY',
                ]);
            if (missingPermissions?.length) {
                await reply(
                    input,
                    `Registered failed:\nI do not have ${missingPermissions
                        .map(perm => `\`${perm}\``)
                        .join(
                            ' '
                        )} permission in ${channel}. Please enable this missing permission for me in ${channel}.`
                );
                return;
            }
            await Promise.all([
                database
                    .ref(`/discord_bot/registry/${guild.id}/${type}`)
                    .set(channel.id),
                database
                    .ref('/last_updated/discord_bot')
                    .set(new Date().toISOString()),
            ]);
            yesNoButton(
                input,
                `Registered Channel ${channel} to provide ${type}. Post ${type} in ${channel} now?`,
                async sentMessage =>
                    postNow(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        type
                    )
            );
            break;
        }
        case 'list': {
            const checkedMessage = await checkRegistered(guild);
            await reply(
                input,
                typeof checkedMessage === 'string'
                    ? { content: checkedMessage }
                    : { embeds: [checkedMessage] }
            );
            break;
        }
        default:
            await reply(
                input,
                'Targeted type not found, supported type: `guide` `news`. The correct command format is `.gg register <guide|news> #channel-mention` or list all registered channel with `.gg register list`'
            );
    }
}

export async function unregister(
    input: Message | CommandInteraction
): Promise<void> {
    const { member, guild } = input;
    if (!member || !guild) {
        await reply(input, 'You can only execute this command in a server.');
        return;
    }

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_CHANNELS')
    ) {
        await reply(
            input,
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }
    const type =
        input instanceof Message
            ? input.content.split(' ')[2]
            : input.options.getString('type');
    if (!type?.toLowerCase().match(/^(?:guide|news)$/)) {
        await reply(
            input,
            `\`${type}\` is an invalid type to unregister. You can only unregister \`news\` or \`guide\``
        );
        return;
    }
    const registerChannel = (
        await database
            .ref(`/discord_bot/registry/${guild.id}/${type}`)
            .once('value')
    ).val();
    if (!registerChannel) {
        await reply(
            input,
            `There is no registered channel for \`${type}\`, you do not need to unregister`
        );
        return;
    }
    await Promise.all([
        database.ref(`/discord_bot/registry/${guild.id}/${type}`).set(null),
        database.ref('/last_updated/discord_bot').set(new Date().toISOString()),
    ]);
    await reply(
        input,
        `Unregistered channel <#${registerChannel}> for \`${type}\`, the previous ${type} information in <#${registerChannel}> stays but will not no longer auto update.`
    );
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'register',
        description:
            'Register a channel to sync news or guide from the website to your server.',
        options: [
            {
                name: 'type',
                description: 'Either guide or news',
                required: true,
                type: 3,
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
            {
                name: 'channel',
                description: 'The channel to register',
                required: true,
                type: 7,
            },
        ],
    },
    {
        name: 'unregister',
        description: 'Unregister a channel to provide news or guide',
        options: [
            {
                name: 'type',
                description: 'Either guide or news',
                required: true,
                type: 3,
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
    },
];
