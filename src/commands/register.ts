import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import postNow from './postNow';
import cooldown from '../helper/cooldown';

async function checkRegistered(
    guild: Discord.Guild,
    database: admin.database.Database
): Promise<Discord.MessageEmbed | string> {
    const registeredChannel = (
        await database.ref(`/discord_bot/registry/${guild.id}`).once('value')
    ).val();
    if (!registeredChannel) {
        return 'You have no registered channel. Start registering channel by doing `.gg register`';
    }
    return new Discord.MessageEmbed()
        .setTitle('Registered Channels')
        .setDescription('Here is the list of registered channel for the type')
        .setAuthor(
            'Random Dice Community Website',
            'https://randomdice.gg/android-chrome-512x512.png',
            'https://randomdice.gg/'
        )
        .setColor('#6ba4a5')
        .addFields(
            Object.entries(registeredChannel).map(([type, channelId]) => ({
                name: type,
                value: `<#${channelId}>`,
            }))
        );
}

export async function register(
    client: Discord.Client,
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { member, guild, content, mentions, channel } = message;

    if (
        await cooldown(message, '.gg register', {
            default: 5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }
    if (!member || !guild) {
        await channel.send('You can only execute this command in a server.');
        return;
    }
    const args = content.split(' ');
    const type = args[2];
    const targetedChannel =
        mentions.channels.first() || client.channels.cache.get(args[3] || '');

    if (!member.hasPermission('MANAGE_CHANNELS')) {
        await channel.send(
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }

    switch (type) {
        case 'guide':
        case 'news': {
            if (!targetedChannel) {
                await channel.send(
                    `Please mention a channel as in \`.gg register ${type.toLowerCase()} #channel\` that you would like to register ${type} in.`
                );
            } else {
                const registry = (
                    await database
                        .ref(`/discord_bot/registry/${guild.id}`)
                        .once('value')
                ).val();
                const channelRegistered = Object.entries(registry || {}).find(
                    ([registeredType, registeredChannelId]) =>
                        registeredChannelId === targetedChannel.id &&
                        registeredType !== type
                );
                if (channelRegistered) {
                    await channel.send(
                        'You cannot register 2 categories into the same channel, please register another channel.'
                    );
                    return;
                }
                const missingPermissions = (targetedChannel as Discord.GuildChannel)
                    .permissionsFor(client.user as Discord.ClientUser)
                    ?.missing([
                        'VIEW_CHANNEL',
                        'SEND_MESSAGES',
                        'MANAGE_MESSAGES',
                        'READ_MESSAGE_HISTORY',
                    ]);
                if (missingPermissions?.length) {
                    await channel.send(
                        `Registered failed:\nI do not have ${missingPermissions
                            .map(perm => `\`${perm}\``)
                            .join(
                                ' '
                            )} permission in ${targetedChannel.toString()}. Please enable this missing permission for ${client.user?.toString()} in ${targetedChannel.toString()}.`
                    );
                    return;
                }
                await Promise.all([
                    database
                        .ref(`/discord_bot/registry/${guild.id}/${type}`)
                        .set(targetedChannel.id),
                    database
                        .ref('/last_updated/discord_bot')
                        .set(new Date().toISOString()),
                ]);
                const sentMessage = await channel.send(
                    `Registered Channel ${targetedChannel.toString()} to provide ${type}. Post information for ${type} in ${targetedChannel.toString()} now? You may answer \`yes\` to post information now.`
                );
                let answeredYes = false;
                try {
                    const awaitedMessage = await channel.awaitMessages(
                        (newMessage: Discord.Message) =>
                            newMessage.author === message.author &&
                            !!newMessage.content
                                .replace(/[^\040-\176\200-\377]/gi, '')
                                .match(/^(y(es)?|no?|\\?\.gg ?)/i),
                        { time: 60000, max: 1, errors: ['time'] }
                    );
                    if (
                        awaitedMessage
                            .first()
                            ?.content.replace(/[^\040-\176\200-\377]/gi, '')
                            .match(/^y(es)?/i)
                    ) {
                        answeredYes = true;
                    }
                } catch {
                    if (sentMessage.editable)
                        await sentMessage.edit(
                            `Registered Channel ${targetedChannel.toString()} to provide ${type}.`
                        );
                }
                if (answeredYes) {
                    await postNow(message, client);
                } else if (sentMessage.editable) {
                    await sentMessage.edit(
                        `Registered Channel ${targetedChannel.toString()} to provide ${type}.`
                    );
                }
            }
            break;
        }
        case 'list':
            await channel.send(await checkRegistered(guild, database));
            break;
        default:
            await channel.send(
                'Targeted type not found, supported type: `guide` `news`. The correct command format is `.gg register <guide|news> #channel-mention` or list all registered channel with `.gg register list`'
            );
    }
}

export async function unregister(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { member, guild, content, channel } = message;
    if (!member || !guild) {
        await channel.send('You can only execute this command in a server.');
        return;
    }

    if (!member.hasPermission('MANAGE_CHANNELS')) {
        await channel.send(
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }
    const type = content.split(' ')[2];
    if (!type?.toLowerCase().match(/^(?:guide|news)$/)) {
        await channel.send(
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
        await channel.send(
            `There is no registered channel for \`${type}\`, you do not need to unregister`
        );
        return;
    }
    await Promise.all([
        database.ref(`/discord_bot/registry/${guild.id}/${type}`).set(null),
        database.ref('/last_updated/discord_bot').set(new Date().toISOString()),
    ]);
    await channel.send(
        `Unregistered channel <#${registerChannel}> for \`${type}\`, the previous ${type} information in <#${registerChannel}> stays but will not no longer auto update.`
    );
}
