import { coinDice } from 'config/emojiId';
import roleIds from 'config/roleId';
import {
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { checkIfUserIsInteractionInitiator } from 'util/notYourButtonResponse';
import yesNoButton from 'util/yesNoButton';
import { getBalance } from '../balance';
import { noActiveRaffleResponse } from './util';

const numberFormat = new Intl.NumberFormat();

async function validateJoinRaffle(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    ticketAmountArg: string
): Promise<number | null> {
    const { member } = interaction;
    const balance = await getBalance(interaction);
    if (balance === null) return null;
    const entries = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(entries.tickets ?? {});
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    if (raffleTimeLeft < 0) {
        await noActiveRaffleResponse(interaction);
        return null;
    }

    if (ticketAmountArg === '0') {
        await interaction.reply('You cannot enter the raffle with 0 ticket');
        return null;
    }

    const prevEntry =
        currentEntries.filter(([, uid]) => uid === member.id)?.length || 0;

    let currEntry = 0;
    if (/max/i.test(ticketAmountArg)) {
        if (prevEntry === entries.maxEntries) {
            await interaction.reply(
                `${member} You have already entered with max entries (${entries.maxEntries} tickets). Use \`!raffle info\` to review your entries.`
            );
            return null;
        }
        if (balance < entries.ticketCost) {
            await interaction.reply(
                `${member} The cost per ticket in this raffle is ${coinDice} ${entries.ticketCost} but you only have ${coinDice} ${balance}. You can't even join with 1 ticket, let alone \`max\`.`
            );
            return null;
        }
        currEntry = Math.min(
            entries.maxEntries - prevEntry,
            Math.floor(balance / entries.ticketCost)
        );
    } else {
        currEntry = Number(ticketAmountArg) || 1;
        if (!Number.isInteger(currEntry) || currEntry < 1) {
            await interaction.reply(
                'Tickets entered should be a positive integer or `max`'
            );
            return null;
        }
    }
    if (currEntry + prevEntry > entries.maxEntries) {
        await interaction.reply(
            `${member} You have already entered with ${prevEntry} ticket(s), the max entires allowance per person for this raffle is ${
                entries.maxEntries
            } ticket(s). You can only join with ${
                entries.maxEntries - prevEntry
            } more ticket(s). Use \`!raffle info\` to review your entries.`
        );
        return null;
    }
    if (balance < currEntry * entries.ticketCost) {
        await interaction.reply(
            `${member} You don't have enough dice coins to enter with ${currEntry} ticket(s). The total cost for ${currEntry} ticket(s) is ${coinDice} **${numberFormat.format(
                currEntry * entries.ticketCost
            )}** but you have only ${coinDice} **${numberFormat.format(
                balance
            )}**.`
        );
        return null;
    }
    return currEntry;
}

export default async function joinRaffle(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    ticketAmountArg: string
): Promise<void> {
    const { member } = interaction;
    const entries = cache['discord_bot/community/raffle'];
    const memberEntry = await validateJoinRaffle(interaction, ticketAmountArg);

    if (!memberEntry) return;

    await yesNoButton(
        interaction,
        `${member} You are entering the raffle with \`${ticketAmountArg}\` entries, which will cost you ${coinDice} ${
            memberEntry * entries.ticketCost
        }, press yes if you wish to continue.`
    );
}

export async function confirmJoinRaffleButton(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, message } = interaction;

    const ref = database.ref('discord_bot/community/raffle');
    const entries = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(entries.tickets ?? {});

    const {
        content,
        embeds: [embed],
    } = message;

    const [, , ticketAmountArg] =
        content.match(
            /<@!?(\d{18})> You are entering the raffle with `(\d+|max)` entries/
        ) ?? [];

    if (!(await checkIfUserIsInteractionInitiator(interaction))) return;

    const currEntry = await validateJoinRaffle(
        interaction,
        ticketAmountArg === 'max'
            ? entries.maxEntries.toString()
            : ticketAmountArg
    );

    if (embed.timestamp !== entries.endTimestamp) {
        await interaction.reply({
            content: 'This raffle has ended, please join with the new one.',
            ephemeral: true,
        });
        return;
    }

    if (!currEntry) return;

    const balance = await getBalance(interaction);
    if (balance === null) return;

    const prevEntry =
        currentEntries.filter(([, uid]) => uid === member.id)?.length || 0;

    entries.tickets = entries.tickets || {};
    for (
        let i = currentEntries.length;
        i < currEntry + currentEntries.length;
        i += 1
    ) {
        entries.tickets[i + 1] = member.id;
    }
    await ref.child('tickets').set(entries.tickets);
    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance - currEntry * entries.ticketCost);
    const gambleProfile =
        cache['discord_bot/community/currency'][member.id]?.gamble;
    await database
        .ref(`discord_bot/community/currency/${member.id}/gamble/lose`)
        .set((gambleProfile?.lose || 0) + currEntry * entries.ticketCost);

    await interaction.reply({
        content: `${member} You have entered the raffle with ${currEntry} ticket(s), costing you ${coinDice} **${numberFormat.format(
            currEntry * entries.ticketCost
        )}**${
            prevEntry > 0
                ? `, you now have a total of ${currEntry + prevEntry} ticket(s)`
                : '.'
        }\nTicket Numbers: ${Object.entries(entries.tickets ?? {})
            .filter(([, uid]) => uid === member.id)
            .map(([ticketNumber]) => `**${ticketNumber}**`)
            .join(', ')}`,
        components: [],
    });
    if (!member.roles.cache.has(roleIds['Raffle Ping'])) {
        await interaction.followUp({
            embeds: [
                new MessageEmbed()
                    .setTitle('Tip!')
                    .setColor('#32cd32')
                    .setDescription(
                        `It looks like you are missing the role <@&${roleIds['Raffle Ping']}>, your can sign up for this role to get notified for the raffle updates when it ends or starts. You can click ✅ to claim this role now.`
                    ),
            ],
            components: [
                new MessageActionRow().addComponents([
                    new MessageButton()
                        .setEmoji('✅')
                        .setStyle('SUCCESS')
                        .setLabel('Get the role')
                        .setCustomId('get-raffle-ping-role'),
                ]),
            ],
        });
    }
}

export async function joinRaffleButton(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (
        await cooldown(
            interaction,
            {
                default: 10 * 1000,
                donator: 10 * 1000,
            },
            'raffle'
        )
    ) {
        return;
    }
    const { customId } = interaction;
    await joinRaffle(interaction, customId.replace('raffle-join-', ''));
}
