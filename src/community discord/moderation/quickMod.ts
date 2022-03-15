import { setTimer } from 'community discord/timer';
import {
    ApplicationCommandData,
    GuildMember,
    TextBasedChannel,
    User,
} from 'discord.js';
import { ban, warn } from '.';

// eslint-disable-next-line import/prefer-default-export
export async function hackwarn(
    target: GuildMember,
    moderator: GuildMember,
    channel: TextBasedChannel | null
): Promise<void> {
    await warn(
        target.user,
        'As per the Discord Terms of Service and 111% Terms of Service we do not allow our members to be in any servers related to the discussion of hacking tools or products, please leave those servers within the 24 hours or you will be banned from our server. Thank you for your cooperation',
        moderator
    );
    if (channel)
        await setTimer(
            channel,
            moderator,
            `Ban ${target.displayName ?? 'this member'} in 24 hours.`,
            1000 * 60 * 60 * 24
        );
}

export async function hackban(
    target: User,
    moderator: GuildMember
): Promise<void> {
    await ban(
        target,
        'Random Dice Hack Discord related activity',
        moderator,
        null
    );
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'hackwarn',
        description: 'Warn a user for hacking related activity',
        defaultPermission: false,
        options: [
            {
                name: 'member',
                description: 'The member to be warned.',
                type: 'USER',
                required: true,
            },
        ],
    },
    {
        name: 'hackban',
        description: 'Ban a user for hacking related activity',
        defaultPermission: false,
        options: [
            {
                name: 'member',
                description: 'The member to be banned.',
                type: 'USER',
                required: true,
            },
        ],
    },
];
