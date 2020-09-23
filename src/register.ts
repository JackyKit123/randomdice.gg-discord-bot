import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';

async function checkRegistered(
    guild: Discord.Guild,
    database: admin.database.Database
): Promise<Discord.MessageEmbed> {
    const registeredChannel = (
        await database.ref(`/discord_bot/${guild.id}`).once('value')
    ).val();
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
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { member, guild, content, mentions, channel } = message;
    if (!member || !guild) {
        await channel.send('You can only execute this command in a server.');
        return;
    }
    const type = content.split(' ')[2];
    const targetedChannel = mentions.channels.first();

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
                await channel.send('I cannot locate the channel to register.');
            } else {
                const registry = (
                    await database.ref(`/discord_bot/${guild.id}`).once('value')
                ).val();
                const channelRegistered = Object.entries(registry || {}).find(
                    ([registeredType, registeredChannelId]) =>
                        registeredChannelId === targetedChannel.id &&
                        registeredType !== type
                );
                if (channelRegistered) {
                    await channel.send(
                        'You cannot register 2 categories into the same channel, please register another channel'
                    );
                    return;
                }
                await database
                    .ref(`/discord_bot/${guild.id}/${type}`)
                    .set(targetedChannel.id);
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
                'Targeted type not found, supported type: `guide` `news` `list`'
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
    await database.ref(`/discord_bot/${guild.id}/${type}`).set(null);
    await channel.send(`Unregistered updates for ${type}`);
}
