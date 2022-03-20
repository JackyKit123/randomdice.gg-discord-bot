import checkPermission from 'community discord/util/checkPermissions';
import { eventManagerRoleIds } from 'config/roleId';
import { ButtonInteraction, CommandInteraction } from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import { checkIfUserIsInteractionInitiator } from 'util/notYourButtonResponse';
import yesNoButton from 'util/yesNoButton';
import { noActiveRaffleResponse } from './util';

export default async function cancelRaffle(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const entries = cache['discord_bot/community/raffle'];
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    if (raffleTimeLeft < 0) {
        await noActiveRaffleResponse(interaction);
        return;
    }

    if (!(await checkPermission(interaction, ...eventManagerRoleIds))) return;

    await yesNoButton(
        interaction,
        '⚠️ WARNING ⚠️\n Are you sure you want to cancel the raffle, the action is irreversible.'
    );
}

export async function confirmCancelRaffleButton(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    if (!(await checkIfUserIsInteractionInitiator(interaction))) return;
    const ref = database.ref('discord_bot/community/raffle');
    await ref.set({
        endTimestamp: 0,
        hostId: 0,
        maxEntries: 0,
        ticketCost: 0,
    });
    await interaction.reply(`${interaction.user} has cancelled the raffle.`);
}
