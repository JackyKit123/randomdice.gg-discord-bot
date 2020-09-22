import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';

async function checkRegistered(
    guild: Discord.Guild,
    database: admin.database.Database
) {
    try {
        const registeredChannel = (
            await database.ref(`/discord_bot/${guild.id}`).once('value')
        ).val();
        return new Discord.MessageEmbed()
            .setTitle('Registered Channels')
            .setDescription(
                'Here is the list of registered channel for the type'
            )
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
    } catch (err) {
        throw err;
    }
}

export default async function register(
    message: Discord.Message,
    database: admin.database.Database
) {
    const { member, guild, content, mentions, channel } = message;
    if (!member || !guild) {
        return;
    }
    const type = content.split(' ')[2];
    const targetedChannel = mentions.channels.first();
    try {
        if (!member.hasPermission('MANAGE_CHANNELS')) {
            await channel.send(
                'you lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
            );
            return;
        }

        switch (type) {
            case 'guide': {
                if (!targetedChannel) {
                    await channel.send(
                        'I cannot locate the channel to register.'
                    );
                } else {
                    await database
                        .ref(`/discord_bot/${guild.id}/guide`)
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
                    'target type not found, supported type: `guide` `list`'
                );
        }
    } catch (err) {
        try {
            await channel.send(
                `error when registering channel: ${err.message}`
            );
        } catch (criticalError) {
            throw err;
        }
    }
}
