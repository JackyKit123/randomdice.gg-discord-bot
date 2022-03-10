import {
    ApplicationCommandData,
    ButtonInteraction,
    Client,
    CommandInteraction,
    Guild,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import { parseStringIntoMs } from 'util/parseMS';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { coinDice } from 'config/emojiId';
import channelIds from 'config/channelIds';
import roleIds, { eventManagerRoleIds } from 'config/roleId';
import checkPermission from 'community discord/util/checkPermissions';
import yesNoButton from 'util/yesNoButton';
import { getBalance } from './balance';

const numberFormat = new Intl.NumberFormat();

async function host(
    duration: number,
    maxEntries: number,
    ticketCost: number,
    guild: Guild,
    author: User
): Promise<MessageEmbed> {
    const ref = database.ref('discord_bot/community/raffle');

    await ref.set({
        endTimestamp: Date.now() + duration,
        hostId: author.id,
        maxEntries,
        ticketCost,
    });
    return new MessageEmbed()
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
        .setTimestamp(Date.now() + duration);
}

function getJoinRaffleMessageButtons(maxEntries: number): [MessageActionRow] {
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
    return [
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
}

async function announceWinner(guild: Guild): Promise<void> {
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
        const newRaffleEmbed = await host(
            duration,
            maxEntries,
            ticketCost,
            guild,
            clientUser
        );
        const sentMessage = await channel.send({
            content: `<@&${roleIds['Raffle Ping']}>`,
            embeds: announceWinnerEmbed
                ? [announceWinnerEmbed, newRaffleEmbed]
                : [newRaffleEmbed],
            components: getJoinRaffleMessageButtons(maxEntries),
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

const getDefaultEmbed = (guild: Guild | null) =>
    new MessageEmbed()
        .setAuthor({
            name: 'randomdice.gg Server',
            iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
        })
        .setTitle('Dice Coins Raffle');

const noActiveRaffleResponse = async (
    interaction: ButtonInteraction | CommandInteraction
) =>
    interaction.reply({
        embeds: [
            getDefaultEmbed(interaction.guild)
                .setColor('#ff0000')
                .setDescription('There is no active raffle at the moment'),
        ],
    });

async function joinRaffle(
    interaction: CommandInteraction | ButtonInteraction,
    ticketAmountArg: string
) {
    if (!interaction.inCachedGuild()) return;
    const { member, channel } = interaction;

    const balance = await getBalance(interaction);
    if (balance === null) return;
    const ref = database.ref('discord_bot/community/raffle');
    const entries = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(entries.tickets ?? {});
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    if (raffleTimeLeft < 0) {
        await noActiveRaffleResponse(interaction);
        return;
    }

    if (ticketAmountArg === '0') {
        await interaction.reply('You cannot enter the raffle with 0 ticket');
        return;
    }
    const prevEntry =
        currentEntries.filter(([, uid]) => uid === member.id)?.length || 0;
    let currEntry = 0;
    if (/max/i.test(ticketAmountArg)) {
        if (prevEntry === entries.maxEntries) {
            await interaction.reply(
                `You have already entered with max entries (${entries.maxEntries} tickets). Use \`!raffle info\` to review your entries.`
            );
            return;
        }
        if (balance < entries.ticketCost) {
            await interaction.reply(
                `The cost per ticket in this raffle is ${coinDice} ${entries.ticketCost} but you only have ${coinDice} ${balance}. You can't even join with 1 ticket, let alone \`max\`.`
            );
            return;
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
            return;
        }
    }
    if (currEntry + prevEntry > entries.maxEntries) {
        await interaction.reply(
            `You have already entered with ${prevEntry} ticket(s), the max entires allowance per person for this raffle is ${
                entries.maxEntries
            } ticket(s). You can only join with ${
                entries.maxEntries - prevEntry
            } more ticket(s). Use \`!raffle info\` to review your entries.`
        );
        return;
    }
    if (balance < currEntry * entries.ticketCost) {
        await interaction.reply(
            `You don't have enough dice coins to enter with ${currEntry} ticket(s). The total cost for ${currEntry} ticket(s) is ${coinDice} **${numberFormat.format(
                currEntry * entries.ticketCost
            )}** but you have only ${coinDice} **${numberFormat.format(
                balance
            )}**.`
        );
        return;
    }

    await yesNoButton(
        interaction,
        `You are entering the raffle with \`${ticketAmountArg}\` entries, which will cost you ${coinDice} ${
            currEntry * entries.ticketCost
        }, press yes if you wish to continue.`,
        async () => {
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
                .set(
                    (gambleProfile?.lose || 0) + currEntry * entries.ticketCost
                );

            await interaction.editReply({
                content: `You have entered the raffle with ${currEntry} ticket(s), costing you ${coinDice} **${numberFormat.format(
                    currEntry * entries.ticketCost
                )}**${
                    prevEntry > 0
                        ? `, you now have a total of ${
                              currEntry + prevEntry
                          } ticket(s)`
                        : '.'
                }\nTicket Numbers: ${Object.entries(entries.tickets ?? {})
                    .filter(([, uid]) => uid === member.id)
                    .map(([ticketNumber]) => `**${ticketNumber}**`)
                    .join(', ')}`,
                components: [],
            });
            if (!member.roles.cache.has(roleIds['Raffle Ping'])) {
                await channel?.send({
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
    );
}

export async function joinRaffleButton(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (
        await cooldown(interaction, 'raffle', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }
    const { customId } = interaction;
    await joinRaffle(interaction, customId.replace('raffle-join-', ''));
}

export default async function raffle(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, options, guild, user, commandName } = interaction;

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

    if (
        await cooldown(interaction, commandName, {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const balance = await getBalance(interaction);
    if (balance === null) return;
    const ref = database.ref('discord_bot/community/raffle');
    const entries = cache['discord_bot/community/raffle'];
    const subcommand = options.getSubcommand(true);
    const currentEntries = Object.entries(entries.tickets ?? {});
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    switch (subcommand) {
        case 'info':
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
            return;
        case 'join':
            await joinRaffle(
                interaction,
                options.getString('ticket-amount', true)
            );
            return;
        case 'host': {
            if (!(await checkPermission(interaction, ...eventManagerRoleIds)))
                return;
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
                await interaction.reply(
                    'Max entries should be between 0 - 100'
                );
                return;
            }
            if (time > 604800000) {
                await interaction.reply(
                    'The duration for the raffle is too long.'
                );
                return;
            }
            await interaction.reply({
                embeds: [await host(time, maxEntries, ticketCost, guild, user)],
                components: getJoinRaffleMessageButtons(maxEntries),
            });
            await channel.send(
                `<@&${roleIds['Raffle Ping']}> A new raffle has started!`
            );
            await announceWinner(guild);
            return;
        }
        case 'cancel':
            if (raffleTimeLeft < 0) {
                await noActiveRaffleResponse(interaction);
                return;
            }
            if (!(await checkPermission(interaction, ...eventManagerRoleIds)))
                return;
            await yesNoButton(
                interaction,
                '⚠️ WARNING ⚠️\n Are you sure you want to cancel the raffle, the action is irreversible.',
                async () => {
                    await ref.set({
                        endTimestamp: 0,
                        hostId: 0,
                        maxEntries: 0,
                        ticketCost: 0,
                    });
                    await interaction.editReply({
                        content: `${user} has cancelled the raffle.`,
                        components: [],
                    });
                }
            );

            break;
        default:
    }
}

export async function addRafflePingRole(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
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

export async function setRaffleTimerOnBoot(client: Client): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    if (!guild) return;
    await announceWinner(guild);
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
