import channelIds from 'config/channelIds';
import {
    ApplicationCommandData,
    ButtonInteraction,
    Client,
    CommandInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { getBalance } from 'community discord/currency/balance';
import { getCommunityDiscord } from 'config/guild';
import roleIds from 'config/roleId';
import hostRaffle, { announceWinner } from './host';
import joinRaffle from './join';
import cancelRaffle from './cancel';
import raffleInfo from './info';

export default async function raffle(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, options } = interaction;

    if (
        channel?.id !== channelIds['dice-coins-raffle'] &&
        channel?.id !== channelIds['jackykit-playground-v2']
    ) {
        await interaction.reply({
            content: `You can only use this command in <#${channelIds['dice-coins-raffle']}>`,
            ephemeral: true,
        });

        return;
    }

    const balance = await getBalance(interaction);
    if (balance === null) return;

    if (
        await cooldown(interaction, {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const subcommand = options.getSubcommand(true);

    switch (subcommand) {
        case 'info':
            await raffleInfo(interaction);
            break;
        case 'join':
            await joinRaffle(
                interaction,
                options.getString('ticket-amount', true)
            );
            break;
        case 'host':
            await hostRaffle(interaction);
            break;
        case 'cancel':
            await cancelRaffle(interaction);
            break;
        default:
    }
}

export async function setRaffleTimerOnBoot(client: Client): Promise<void> {
    await announceWinner(getCommunityDiscord(client));
}

export async function addRafflePingRole(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    const { member } = interaction;
    if (member.roles.cache.has(roleIds['Raffle Ping'])) {
        await interaction.reply({
            content: 'You already have the raffle ping role',
            ephemeral: true,
        });
        return;
    }
    await member.roles.add(
        roleIds['Raffle Ping'],
        'Member clicked ✅ on the raffle ping role'
    );
    await interaction.reply(
        `${member} You have been given the raffle ping role, you can now receive notifications for the raffle updates.`
    );
}

export const commandData: ApplicationCommandData = {
    name: 'raffle',
    description: 'Raffle commands',
    options: [
        {
            name: 'host',
            description: 'Host a raffle',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'time',
                    description: 'Time for the raffle to last',
                    type: 'STRING',
                    required: true,
                },
                {
                    name: 'ticket-cost',
                    description: 'Cost of each ticket',
                    type: 'INTEGER',
                    required: true,
                    minValue: 1,
                    maxValue: 100000,
                },
                {
                    name: 'max-entries',
                    description: 'Max number of entries',
                    type: 'INTEGER',
                    required: true,
                    minValue: 1,
                    maxValue: 100,
                },
            ],
        },
        {
            name: 'join',
            description: 'Join a raffle',
            type: 'SUB_COMMAND',
            options: [
                {
                    name: 'ticket-amount',
                    description: 'amount of tickets to buy or "max"',
                    type: 'STRING',
                    required: true,
                },
            ],
        },
        {
            name: 'cancel',
            description: 'Cancel a raffle',
            type: 'SUB_COMMAND',
        },
        {
            name: 'info',
            description: 'Get info about the raffle',
            type: 'SUB_COMMAND',
        },
    ],
};
