import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';

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
            'https://randomdice.gg/title_dice.png',
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
                await Promise.all([
                    database
                        .ref(`/discord_bot/registry/${guild.id}/${type}`)
                        .set(targetedChannel.id),
                    database
                        .ref('/last_updated/discord_bot')
                        .set(new Date().toISOString()),
                ]);
                await channel.send(
                    `Registered Channel <#${targetedChannel.id}> to provide ${type}`
                );
            }
            break;
        }
        case 'list':
            await channel.send(await checkRegistered(guild, database));
            break;
        default:
            await channel.send(
                'Targeted type not found, supported type: `guide` `news`, or list all registered channel `.gg register list`'
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
    await Promise.all([
        database.ref(`/discord_bot/registry/${guild.id}/${type}`).set(null),
        database.ref('/last_updated/discord_bot').set(new Date().toISOString()),
    ]);
    await channel.send(`Unregistered updates for ${type}`);
}
