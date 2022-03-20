import checkPermission from 'community discord/util/checkPermissions';
import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import roleIds, { eventManagerRoleIds } from 'config/roleId';
import {
    CommandInteraction,
    Guild,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import { parseStringIntoMs } from 'util/parseMS';
import { getBalance } from '../balance';

const numberFormat = new Intl.NumberFormat();

async function start(
    duration: number,
    maxEntries: number,
    ticketCost: number,
    guild: Guild,
    author: User
): Promise<{ embeds: [MessageEmbed]; components: [MessageActionRow] }> {
    const ref = database.ref('discord_bot/community/raffle');

    await ref.set({
        endTimestamp: Date.now() + duration,
        hostId: author.id,
        maxEntries,
        ticketCost,
    });
    let buttons: number[] = [];
    if (maxEntries < 6) {
        buttons = [1];
    } else if (maxEntries < 7) {
        buttons = [1, 5];
    } else if (maxEntries < 22) {
        buttons = [1, 5, 10];
    } else if (maxEntries < 52) {
        buttons = [1, 5, 10, 20];
    } else {
        buttons = [1, 10, 20, 50];
    }
    const components: [MessageActionRow] = [
        new MessageActionRow().addComponents([
            ...buttons.map(button =>
                new MessageButton()
                    .setLabel(`Buy ${button} Tickets`)
                    .setEmoji('🎫')
                    .setStyle('PRIMARY')
                    .setCustomId(`raffle-join-${button}`)
            ),
            new MessageButton()
                .setLabel(`Join MAX Tickets`)
                .setEmoji('🎫')
                .setStyle('DANGER')
                .setCustomId('raffle-join-max'),
        ]),
    ];
    const embeds: [MessageEmbed] = [
        new MessageEmbed()
            .setAuthor({
                name: 'randomdice.gg Server',
                iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
            })
            .setColor('#00ff00')
            .setTitle('New Dice Coins Raffle')
            .addField(
                'Ticket Entries',
                `${coinDice} **${ticketCost} per ticket** (${maxEntries} max)`
            )
            .addField('Hosted by', `${author}`)
            .setFooter({ text: 'Raffle ends at' })
            .setTimestamp(Date.now() + duration),
    ];
    return { embeds, components };
}

export async function announceWinner(guild: Guild): Promise<void> {
    const channel = guild.channels.cache.get(channelIds['dice-coins-raffle']);
    const { client } = guild;
    const clientUser = client.user;
    if (channel?.type !== 'GUILD_TEXT' || !channel.isText() || !clientUser)
        return;
    let raffleInfo = cache['discord_bot/community/raffle'];

    const hostNewRaffle = async (
        announceWinnerEmbed?: MessageEmbed
    ): Promise<Message> => {
        const duration = 1000 * 60 * 60 * Math.ceil(Math.random() * 36 + 12); // 12 - 48 hours in random
        const ticketCost = Math.ceil(
            10 ** (Math.floor(Math.random() * 4) + 2) * Math.random()
        );
        let maxEntries = 100;
        while (maxEntries * ticketCost > 200_000) {
            maxEntries = Math.ceil(Math.random() * 100);
        }
        const { embeds, components } = await start(
            duration,
            maxEntries,
            ticketCost,
            guild,
            clientUser
        );
        const sentMessage = await channel.send({
            content: `<@&${roleIds['Raffle Ping']}>`,
            embeds: announceWinnerEmbed
                ? [announceWinnerEmbed, ...embeds]
                : embeds,
            components,
        });
        await announceWinner(guild);
        return sentMessage;
    };
    if (!raffleInfo.hostId) {
        await hostNewRaffle();
        return;
    }

    if (raffleInfo.endTimestamp - Date.now() > 0) {
        setTimeout(async () => {
            raffleInfo = cache['discord_bot/community/raffle'];

            const entries = Object.entries(raffleInfo.tickets || {});
            const uniqueEntry: { [uid: string]: string } = {};
            entries.forEach(([, uid]) => {
                if (!uniqueEntry[uid]) {
                    uniqueEntry[uid] = uid;
                }
            });
            const [winningTicket, winner] = entries?.[
                Math.floor(entries.length * Math.random())
            ] || [null, null];

            const amount = entries.length * raffleInfo.ticketCost;
            const announceWinnerEmbed = new MessageEmbed()
                .setAuthor({
                    name: 'randomdice.gg Server',
                    iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
                })
                .setColor('#800080')
                .setTitle('Dice Coins Raffle')
                .setDescription(
                    entries.length === 0
                        ? 'Raffle ended but no one entered the raffle.'
                        : `Raffle ended, **${
                              Object.keys(uniqueEntry).length
                          }** people entered the raffle with a total of **${
                              entries.length
                          }** tickets. The winning ticket is ||**${winningTicket}**, <@${winner}>|| walked away grabbing ${coinDice} **${numberFormat.format(
                              amount
                          )}**. Congratulations!`
                )
                .setFooter({
                    text: 'A new round of raffle will be hosted very soon',
                });

            const ref = database.ref('discord_bot/community/raffle');
            await ref.set({
                endTimestamp: 0,
                hostId: 0,
                maxEntries: 0,
                ticketCost: 0,
            });
            const sentAnnouncement = await hostNewRaffle(announceWinnerEmbed);
            if (entries.length === 0) {
                return;
            }
            const target = await guild.members.fetch(winner);
            if (!target) {
                await channel.send(`Cannot add currency to ${target}`);
                return;
            }
            const balance = await getBalance(sentAnnouncement, true, target);
            if (balance === null) return;
            const gambleProfile =
                cache['discord_bot/community/currency'][target.id]?.gamble;
            await database
                .ref(`discord_bot/community/currency/${target.id}/gamble/gain`)
                .set((gambleProfile?.gain || 0) + amount);
            await database
                .ref(`discord_bot/community/currency/${target.id}/balance`)
                .set(balance + amount);
        }, raffleInfo.endTimestamp - Date.now());
    }
}

export default async function hostRaffle(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const { options, guild, user, channel } = interaction;
    const entries = cache['discord_bot/community/raffle'];
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    if (!(await checkPermission(interaction, ...eventManagerRoleIds))) return;
    if (raffleTimeLeft > 0) {
        await interaction.reply(
            'There is already an active raffle! Use `/raffle cancel` to cancel it before starting a new one.'
        );
        return;
    }
    const time = parseStringIntoMs(options.getString('time', true));
    const ticketCost = options.getInteger('ticket-cost', true);
    const maxEntries = options.getInteger('max-entries', true);
    if (!time) {
        await interaction.reply(
            'You must specify a valid time duration for the raffle in format like 1d2h3m.'
        );
        return;
    }
    if (maxEntries < 0 || maxEntries > 100) {
        await interaction.reply('Max entries should be between 0 - 100');
        return;
    }
    if (time > 604800000) {
        await interaction.reply('The duration for the raffle is too long.');
        return;
    }
    await interaction.reply(
        await start(time, maxEntries, ticketCost, guild, user)
    );
    await channel?.send(
        `<@&${roleIds['Raffle Ping']}> A new raffle has started!`
    );
    await announceWinner(guild);
}
