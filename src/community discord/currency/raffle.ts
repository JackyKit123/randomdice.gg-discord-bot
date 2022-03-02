import {
    Client,
    DiscordAPIError,
    Guild,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    User,
} from 'discord.js';
import { database } from 'register/firebase';
import getBalance from 'util/getBalance';
import { parseStringIntoMs } from 'util/parseMS';
import cache from 'util/cache';
import cooldown from 'util/cooldown';

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
            `<:dicecoin:839981846419079178> **${ticketCost} per ticket** (${maxEntries} max)`
        )
        .addField('Hosted by', `${author}`)
        .setFooter({ text: 'Raffle ends at' })
        .setTimestamp(Date.now() + duration);
}

async function announceWinner(guild: Guild): Promise<void> {
    const channel = guild.channels.cache.get('807229757049012266');
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
            content: '<@&839694796431294485>',
            embeds: announceWinnerEmbed
                ? [announceWinnerEmbed, newRaffleEmbed]
                : [newRaffleEmbed],
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
                          }** tickets. The winning ticket is ||**${winningTicket}**, <@${winner}>|| walked away grabbing <:dicecoin:839981846419079178> **${numberFormat.format(
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
            let balance = await getBalance(sentAnnouncement, 'silence', target);
            if (balance === false) balance = 10000;
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

export default async function raffle(message: Message): Promise<void> {
    const { channel, member, content, guild, author } = message;

    const [, subcommand, arg, arg2, arg3] = content
        .split(' ')
        .map(word => word.trim());

    if (!member || !guild) return;

    if (channel.id !== '807229757049012266') {
        await channel.send(
            'You can only use this command in <#807229757049012266>'
        );
        return;
    }

    if (
        await cooldown(message, '!raffle', {
            default: 10 * 1000,
            donator: 10 * 1000,
        })
    ) {
        return;
    }

    const balance = await getBalance(message, 'emit new member', member);
    if (balance === false) return;
    const ref = database.ref('discord_bot/community/raffle');
    const entries = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(entries.tickets ?? {});
    const raffleTimeLeft = entries.endTimestamp - Date.now();

    switch (subcommand?.toLowerCase()) {
        case 'info':
            if (raffleTimeLeft > 0) {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor(
                                'randomdice.gg Server',
                                guild.iconURL({ dynamic: true }) ?? undefined
                            )
                            .setColor('#00ff00')
                            .setTitle('Dice Coins Raffle')
                            .addField(
                                'Ticket Entries',
                                `<:dicecoin:839981846419079178> **${entries.ticketCost} per ticket** (${entries.maxEntries} ticket(s) max)`
                            )
                            .addField(
                                'Current Prize Pool',
                                `<:dicecoin:839981846419079178> **${numberFormat.format(
                                    currentEntries.length * entries.ticketCost
                                )}** (${currentEntries.length} Tickets)`
                            )
                            .addField('Hosted by', `<@${entries.hostId}>`)
                            .addField(
                                'Your Entries',
                                Object.entries(entries.tickets ?? {})
                                    .filter(([, uid]) => uid === author.id)
                                    .map(
                                        ([ticketNumber]) =>
                                            `**${ticketNumber}**`
                                    )
                                    .join(', ') || '*none*'
                            )
                            .setFooter('Raffle ends at')
                            .setTimestamp(entries.endTimestamp),
                    ],
                });
            } else {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor(
                                'randomdice.gg Server',
                                guild.iconURL({ dynamic: true }) ?? undefined
                            )
                            .setColor('#ff0000')
                            .setTitle('Dice Coins Raffle')
                            .setDescription(
                                'There is no active raffle at the moment'
                            ),
                    ],
                });
            }
            return;
        case 'join':
            {
                if (author.id === '285696350702796801') {
                    await channel.send(
                        'As per request, you are not allowed to use this command.'
                    );
                    return;
                }

                if (raffleTimeLeft < 0) {
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({
                                    name: 'randomdice.gg Server',
                                    iconURL:
                                        guild.iconURL({ dynamic: true }) ??
                                        undefined,
                                })
                                .setColor('#ff0000')
                                .setTitle('Dice Coins Raffle')
                                .setDescription(
                                    'There is no active raffle at the moment'
                                ),
                        ],
                    });
                    return;
                }
                if (arg === '0') {
                    await channel.send(
                        'You cannot enter the raffle with 0 ticket'
                    );
                    return;
                }
                const prevEntry =
                    currentEntries.filter(([, uid]) => uid === author.id)
                        ?.length || 0;
                let currEntry = 0;
                if (/max/i.test(arg)) {
                    if (prevEntry === entries.maxEntries) {
                        await channel.send(
                            `You have already entered with max entries (${entries.maxEntries} tickets). Use \`!raffle info\` to review your entries.`
                        );
                        return;
                    }
                    if (balance < entries.ticketCost) {
                        await channel.send(
                            `The cost per ticket in this raffle is <:dicecoin:839981846419079178> ${entries.ticketCost} but you only have <:dicecoin:839981846419079178> ${balance}. You can't even join with 1 ticket, let alone \`max\`.`
                        );
                        return;
                    }
                    currEntry = Math.min(
                        entries.maxEntries - prevEntry,
                        Math.floor(balance / entries.ticketCost)
                    );
                    await channel.send(
                        `You are entering the raffle with \`max\` entries, which will cost you <:dicecoin:839981846419079178> ${
                            currEntry * entries.ticketCost
                        }, answer \`yes\` if you wish to continue.`
                    );
                    const awaitedMessage = (
                        await channel.awaitMessages({
                            filter: m =>
                                m.author.id === member.id &&
                                /^(ok(ay)?|y(es)?|no?|!raffle join)/i.test(
                                    m.content
                                ),
                            time: 1000 * 10,
                            max: 1,
                        })
                    )?.first();
                    if (
                        !awaitedMessage ||
                        /no?/i.test(awaitedMessage.content)
                    ) {
                        await channel.send(
                            'Ok looks like you are not joining the raffle yet.'
                        );
                        return;
                    }
                    if (/!raffle join/i.test(awaitedMessage.content)) {
                        return;
                    }
                } else {
                    currEntry = Number(arg) || 1;
                    if (!Number.isInteger(currEntry) || currEntry < 1) {
                        await channel.send(
                            'Tickets entered should be a positive integer or `max`'
                        );
                        return;
                    }
                }
                if (currEntry + prevEntry > entries.maxEntries) {
                    await channel.send(
                        `You have already entered with ${prevEntry} ticket(s), the max entires allowance per person for this raffle is ${
                            entries.maxEntries
                        } ticket(s). You can only join with ${
                            entries.maxEntries - prevEntry
                        } more ticket(s). Use \`!raffle info\` to review your entries.`
                    );
                    return;
                }
                if (balance < currEntry * entries.ticketCost) {
                    await channel.send(
                        `You don't have enough dice coins to enter with ${currEntry} ticket(s). The total cost for ${currEntry} ticket(s) is <:dicecoin:839981846419079178> **${numberFormat.format(
                            currEntry * entries.ticketCost
                        )}** but you have only <:dicecoin:839981846419079178> **${numberFormat.format(
                            balance
                        )}**.`
                    );
                    return;
                }
                entries.tickets = entries.tickets || {};
                for (
                    let i = currentEntries.length;
                    i < currEntry + currentEntries.length;
                    i += 1
                ) {
                    entries.tickets[i + 1] = author.id;
                }
                await ref.child('tickets').set(entries.tickets);
                await database
                    .ref(`discord_bot/community/currency/${member.id}/balance`)
                    .set(balance - currEntry * entries.ticketCost);
                const gambleProfile =
                    cache['discord_bot/community/currency'][author.id]?.gamble;
                await database
                    .ref(
                        `discord_bot/community/currency/${author.id}/gamble/lose`
                    )
                    .set(
                        (gambleProfile?.lose || 0) +
                            currEntry * entries.ticketCost
                    );
                await channel.send(
                    `You have entered the raffle with ${currEntry} ticket(s), costing you <:dicecoin:839981846419079178> **${numberFormat.format(
                        currEntry * entries.ticketCost
                    )}**${
                        prevEntry > 0
                            ? `, you now have a total of ${
                                  currEntry + prevEntry
                              } ticket(s)`
                            : '.'
                    }\nTicket Numbers: ${Object.entries(entries.tickets ?? {})
                        .filter(([, uid]) => uid === author.id)
                        .map(([ticketNumber]) => `**${ticketNumber}**`)
                        .join(', ')}`
                );
                if (!member.roles.cache.has('839694796431294485')) {
                    const sentMessage = await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setTitle('Tip!')
                                .setColor('#32cd32')
                                .setDescription(
                                    'It looks like you are missing the role <@&839694796431294485>, your can sign up for this role to get notified for the raffle updates when it ends or starts. You can click ✅ to claim this role now.'
                                ),
                        ],
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setEmoji('✅')
                                    .setCustomId('✅')
                                    .setStyle('PRIMARY'),
                            ]),
                        ],
                    });
                    sentMessage
                        .createMessageComponentCollector({
                            time: 60000,
                        })
                        .on('collect', async interaction =>
                            interaction.reply({
                                content:
                                    'Added <@&839694796431294485> role to you',
                                ephemeral: true,
                            })
                        )
                        .on('end', async () => {
                            try {
                                await sentMessage.delete();
                            } catch (err) {
                                if (
                                    (err as DiscordAPIError).message !==
                                    'Unknown Message'
                                ) {
                                    throw err;
                                }
                            }
                        });
                    return;
                }
            }
            return;
        case 'host': {
            if (
                !(
                    member.roles.cache.has('805772165394858015') ||
                    member.roles.cache.has('805000661133295616') ||
                    member.permissions.has('ADMINISTRATOR')
                )
            ) {
                await channel.send(
                    'You do not have permission to host a raffle.'
                );
                return;
            }
            const time = parseStringIntoMs(arg);
            const ticketCost = Number(arg2);
            const maxEntries = Number(arg3) || 1;
            if (!time || !ticketCost || !maxEntries) {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle('Command Parse Error')
                            .setColor('#ff0000')
                            .setDescription('usage of the command')
                            .addField(
                                'Hosting a raffle',
                                '`!raffle host <time> <ticketCost> [maxEntries default=1]`' +
                                    '\n' +
                                    'Example```!raffle host 12h30m 1000\n!raffle host 3d 500 4```'
                            ),
                    ],
                });
                return;
            }
            if (maxEntries < 0 || maxEntries > 100) {
                await channel.send('Max entries should be between 0 - 100');
                return;
            }
            if (time > 604800000) {
                await channel.send('The duration for the raffle is too long.');
                return;
            }
            await channel.send({
                content: '<@&839694796431294485>',
                embeds: [
                    await host(time, maxEntries, ticketCost, guild, author),
                ],
            });
            await announceWinner(guild);
            return;
        }
        case 'cancel':
            if (raffleTimeLeft < 0) {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor(
                                'randomdice.gg Server',
                                guild.iconURL({ dynamic: true }) ?? undefined
                            )
                            .setColor('#ff0000')
                            .setTitle('Dice Coins Raffle')
                            .setDescription(
                                'There is no active raffle at the moment'
                            ),
                    ],
                });
                return;
            }
            if (
                !(
                    member.roles.cache.has('805772165394858015') ||
                    member.roles.cache.has('805000661133295616') ||
                    member.permissions.has('ADMINISTRATOR')
                )
            ) {
                await channel.send(
                    'You do not have permission to cancel a raffle.'
                );
                return;
            }
            await channel.send(
                '⚠️ WARNING ⚠️\n Type `end` to cancel the raffle, the action is irreversible.'
            );
            try {
                await channel.awaitMessages({
                    filter: (newMessage: Message) =>
                        newMessage.author.id === author.id &&
                        newMessage.content.toLowerCase() === 'end',
                    time: 60000,
                    max: 1,
                    errors: ['time'],
                });
                await ref.set({
                    endTimestamp: 0,
                    hostId: 0,
                    maxEntries: 0,
                    ticketCost: 0,
                });
                await channel.send(`${author} has cancelled the raffle.`);
            } catch {
                await channel.send(
                    "Ok, look's like we are not canceling the raffle today."
                );
            }
            return;
        default:
            await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Command Parse Error')
                        .setColor('#ff0000')
                        .setDescription('usage of the command')
                        .addField(
                            'Joining the raffle',
                            '`!raffle join [ticket Amount default=1]`' +
                                '\n' +
                                'Example```!raffle join\n!raffle join 10```'
                        )
                        .addField(
                            'Showing the info for current raffle',
                            '`!raffle info`\nExample```!raffle info```'
                        )
                        .addField(
                            'Hosting a raffle (requires Event Manager)',
                            '`!raffle host <time> <ticketCost> [maxEntries default=1]`' +
                                '\n' +
                                'Example```!raffle host 12h30m 1000\n!raffle host 3d 500 4```'
                        )
                        .addField(
                            'Canceling a raffle (requires Event Manager)',
                            '`!raffle cancel`' +
                                '\n' +
                                'Example```!raffle cancel```'
                        ),
                ],
            });
    }
}

export async function setRaffleTimerOnBoot(client: Client): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    if (!guild) return;
    announceWinner(guild);
}
