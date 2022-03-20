import { coinDice } from 'config/emojiId';
import { CommandInteraction } from 'discord.js';
import cache from 'util/cache';
import { getDefaultEmbed, noActiveRaffleResponse } from './util';

const numberFormat = new Intl.NumberFormat();

export default async function raffleInfo(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const { guild, user } = interaction;

    const entries = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(entries.tickets ?? {});
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    if (raffleTimeLeft <= 0) {
        await noActiveRaffleResponse(interaction);
        return;
    }

    await interaction.reply({
        embeds: [
            getDefaultEmbed(guild)
                .setColor('#00ff00')
                .addField(
                    'Ticket Entries',
                    `${coinDice} **${entries.ticketCost} per ticket** (${entries.maxEntries} ticket(s) max)`
                )
                .addField(
                    'Current Prize Pool',
                    `${coinDice} **${numberFormat.format(
                        currentEntries.length * entries.ticketCost
                    )}** (${currentEntries.length} Tickets)`
                )
                .addField('Hosted by', `<@${entries.hostId}>`)
                .addField(
                    'Your Entries',
                    Object.entries(entries.tickets ?? {})
                        .filter(([, uid]) => uid === user.id)
                        .map(([ticketNumber]) => `**${ticketNumber}**`)
                        .join(', ') || '*none*'
                )
                .setFooter({ text: 'Raffle ends at' })
                .setTimestamp(entries.endTimestamp),
        ],
    });
}
