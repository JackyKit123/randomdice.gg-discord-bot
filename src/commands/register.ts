import {
    ApplicationCommandData,
    BaseGuildTextChannel,
    ClientUser,
    CommandInteraction,
    NewsChannel,
} from 'discord.js';
import { database } from 'register/firebase';
import cacheData from 'util/cache';
import cooldown from 'util/cooldown';
import yesNoButton from 'util/yesNoButton';
import postNow from './postNow';

export async function register(interaction: CommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
        await interaction.reply('This command is only available in server');
        return;
    }

    const { client, member, guild, commandName, options } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }

    const type = options.getString('type', true) as 'guide' | 'news';
    const channel = options.getChannel('channel', true) as
        | BaseGuildTextChannel
        | NewsChannel;

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_CHANNELS')
    ) {
        await interaction.reply(
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }

    if (
        cacheData['discord_bot/registry'][guild.id]?.[
            type === 'guide' ? 'news' : 'guide'
        ] === channel.id
    ) {
        await interaction.reply(
            'You cannot register 2 categories into the same channel, please register another channel.'
        );
        return;
    }
    const missingPermissions = channel
        .permissionsFor(client.user as ClientUser)
        ?.missing([
            'VIEW_CHANNEL',
            'SEND_MESSAGES',
            'MANAGE_MESSAGES',
            'READ_MESSAGE_HISTORY',
        ]);
    if (missingPermissions?.length) {
        await interaction.reply(
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
        database.ref('/last_updated/discord_bot').set(new Date().toISOString()),
    ]);
    await yesNoButton(
        interaction,
        `Registered Channel ${channel} to provide ${type}. Post ${type} in ${channel} now?`,
        async () => postNow(interaction, type)
    );
}

export async function unregister(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) {
        await interaction.reply('This command is only available in server');
        return;
    }

    const { member, guild, options } = interaction;

    if (
        !guild.members.cache
            .get(member.user.id)
            ?.permissions.has('MANAGE_CHANNELS')
    ) {
        await interaction.reply(
            'You lack permission to execute this command, required permission: `MANAGE_CHANNELS`'
        );
        return;
    }
    const type = options.getString('type') as 'guide' | 'news';

    const registerChannel = (
        await database
            .ref(`/discord_bot/registry/${guild.id}/${type}`)
            .once('value')
    ).val();
    if (!registerChannel) {
        await interaction.reply(
            `There is no registered channel for \`${type}\`, you do not need to unregister`
        );
        return;
    }

    await Promise.all([
        database.ref(`/discord_bot/registry/${guild.id}/${type}`).set(null),
        database.ref('/last_updated/discord_bot').set(new Date().toISOString()),
    ]);
    await interaction.reply(
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
                        name: 'Sync guides',
                        value: 'guide',
                    },
                    {
                        name: 'Sync News',
                        value: 'news',
                    },
                ],
            },
            {
                name: 'channel',
                description: 'The channel to register',
                required: true,
                type: 'CHANNEL',
                channelTypes: ['GUILD_TEXT', 'GUILD_NEWS'],
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
                type: 'STRING',
                choices: [
                    {
                        name: 'Sync guides',
                        value: 'guide',
                    },
                    {
                        name: 'Sync News',
                        value: 'news',
                    },
                ],
            },
        ],
    },
];
