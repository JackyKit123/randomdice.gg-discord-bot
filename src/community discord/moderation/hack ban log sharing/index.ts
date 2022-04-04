import {
    ApplicationCommandData,
    Client,
    CommandInteraction,
    Guild,
    GuildTextBasedChannel,
} from 'discord.js';
import { database } from 'register/firebase';
import cacheData from 'util/cache';
import checkSendMessagePermission from 'util/checkSendMessagePermission';
import {
    participateInHackBadLogSharing,
    unparticipateInHackBadLogSharing,
    viewHackBanLogParticipatedServers,
} from './setup';

export const setChannelRegistry = (
    guildID: string,
    channel: string | null
): Promise<void> =>
    database
        .ref('discord_bot/registry')
        .child(guildID)
        .child('hacklog')
        .set(channel);

export const getRegisteredChannels = async (
    client: Client
): Promise<Map<Guild, GuildTextBasedChannel>> => {
    const registered = new Map<Guild, GuildTextBasedChannel>();
    await Promise.all(
        Object.entries(cacheData['discord_bot/registry'])
            .filter(([, registry]) => !!registry.hacklog)
            .map(async ([guildID, { hacklog }]) => {
                const guild = client.guilds.cache.get(guildID);
                if (!guild?.me?.permissions.has('VIEW_AUDIT_LOG')) {
                    await setChannelRegistry(guildID, null);
                    return;
                }
                const channel =
                    hacklog && guild
                        ? guild.channels.cache.get(hacklog)
                        : undefined;
                if (!checkSendMessagePermission(channel)) {
                    await setChannelRegistry(guildID, null);
                    return;
                }
                registered.set(guild, channel);
            })
    );
    return registered;
};

export async function hackbanLogConfig(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    switch (interaction.options.getSubcommand(true)) {
        case 'participate':
            await participateInHackBadLogSharing(interaction);
            break;
        case 'unparticipate':
            await unparticipateInHackBadLogSharing(interaction);
            break;
        case 'participants':
            await viewHackBanLogParticipatedServers(interaction);
            break;
        default:
    }
}

export { default as broadcastBanLogOnBan } from './broadcast';
export { default as banLogButtons } from './hackbanButton';
export { default as warnOnBannedMemberJoin } from './bannedUserJoinedWarning';

export const commandData: ApplicationCommandData = {
    name: 'hackban-log',
    description: 'Participate in the hackban log',
    options: [
        {
            name: 'participate',
            description: 'Participate in the hackban log',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'log-channel',
                    description: 'The channel to log to',
                    required: true,
                    type: 'CHANNEL',
                    channelTypes: ['GUILD_TEXT'],
                },
            ],
        },
        {
            name: 'unparticipate',
            description: 'Unparticipate in the hackban log',
            type: 'SUB_COMMAND',
        },
        {
            name: 'participants',
            description: 'View the participants in the hackban log',
            type: 'SUB_COMMAND',
        },
    ],
};
