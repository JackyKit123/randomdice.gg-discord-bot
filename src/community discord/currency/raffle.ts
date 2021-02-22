import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import getBalance from './balance';
import { parseStringIntoMs } from '../../helper/parseMS';
import cache, { Raffle } from '../../helper/cache';
import cooldown from '../../helper/cooldown';

const numberFormat = new Intl.NumberFormat();

async function announceWinner(guild: Discord.Guild): Promise<void> {
    const database = firebase.app().database();
    const channel = guild.channels.cache.get('807229757049012266');
    const ref = database.ref('discord_bot/community/raffle');
    if (channel?.type !== 'text') return;
    let raffle = (await ref.once('value')).val() as Raffle;
    if (!raffle.hostId) {
        return;
    }

    setTimeout(async () => {
        raffle = (await ref.once('value')).val() as Raffle;

        const entries = Object.entries(raffle.tickets ?? {});
        const uniqueEntry = {} as { [uid: string]: string };
        entries.forEach(([, uid]) => {
            if (!uniqueEntry[uid]) {
                uniqueEntry[uid] = uid;
            }
        });
        const [winningTicket, winner] = entries[
            Math.ceil(entries.length * Math.random())
        ];

        const amount =
            entries.length * raffle.ticketCost +
            raffle.maxEntries * raffle.ticketCost * 0.1;
        const winningMessage = await (channel as Discord.TextChannel).send(
            '<@&804544088153391124>',
            new Discord.MessageEmbed()
                .setAuthor(
                    'randomdice.gg Server',
                    guild.iconURL({ dynamic: true }) ?? undefined
                )
                .setColor('#800080')
                .setTitle('Dice Coins Raffle')
                .setDescription(
                    entries.length === 0
                        ? 'Raffle ended but no one entered the raffle.'
                        : `Raffle ended, **${
                              Object.keys(uniqueEntry).length
                          }** people entered the raffle with a total of **${
                              entries.length
                          }** tickets. The winning ticket is ||**${winningTicket}**, <@${winner}>|| walked away grabbing <:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                              amount
                          )}**. Congratulations!`
                )
                .setFooter('A new round of raffle will be hosted very soon')
        );
        await ref.set({
            endTimestamp: 0,
            hostId: 0,
            maxEntries: 0,
            ticketCost: 0,
        });
        const target = await guild.members.fetch(winner);
        if (!target) {
            await (channel as Discord.TextChannel).send(
                `Cannot add currency to ${target}`
            );
            return;
        }
        let balance = await getBalance(winningMessage, 'silence', target);
        if (balance === false) balance = 10000;
        await database
            .ref(`discord_bot/community/currency/${target.id}/balance`)
            .set(balance + amount);
    }, Math.max(raffle.endTimestamp - Date.now(), 0));
}

export default async function lotto(message: Discord.Message): Promise<void> {
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

    const database = firebase.app().database();
    const balance = await getBalance(message, 'emit new member', member);
    if (balance === false) return;
    const ref = database.ref('discord_bot/community/raffle');
    const raffle = cache['discord_bot/community/raffle'];
    const currentEntries = Object.entries(raffle.tickets ?? {});
    const raffleTimeLeft = raffle.endTimestamp - Date.now();

    switch (subcommand?.toLowerCase()) {
        case 'info':
            if (raffleTimeLeft > 0) {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#00ff00')
                        .setTitle('Dice Coins Raffle')
                        .addField(
                            'Ticket Entries',
                            `<:Dice_TierX_Coin:813149167585067008> **${raffle.ticketCost} per ticket** (${raffle.maxEntries} ticket(s) max)`
                        )
                        .addField(
                            'Base Pool (10% of max entries)',
                            `<:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                                raffle.ticketCost * raffle.maxEntries * 0.1
                            )}**`
                        )
                        .addField(
                            'Current Prize Pool',
                            `<:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                                currentEntries.length * raffle.ticketCost
                            )}** (${
                                currentEntries.length
                            } Tickets) + <:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                                raffle.ticketCost * raffle.maxEntries * 0.1
                            )}** (Base Pool)`
                        )
                        .addField('Hosted by', `<@${raffle.hostId}>`)
                        .addField(
                            'Your Entries',
                            Object.entries(raffle.tickets ?? {})
                                .filter(([, uid]) => uid === author.id)
                                .map(([ticketNumber]) => `**${ticketNumber}**`)
                                .join(', ') || '*none*'
                        )
                        .setFooter('Raffle ends at')
                        .setTimestamp(raffle.endTimestamp)
                );
            } else {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#ff0000')
                        .setTitle('Dice Coins Raffle')
                        .setDescription(
                            'There is no active raffle at the moment'
                        )
                );
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
                    await channel.send(
                        new Discord.MessageEmbed()
                            .setAuthor(
                                'randomdice.gg Server',
                                guild.iconURL({ dynamic: true }) ?? undefined
                            )
                            .setColor('#ff0000')
                            .setTitle('Dice Coins Raffle')
                            .setDescription(
                                'There is no active raffle at the moment'
                            )
                    );
                    return;
                }
                if (arg === '0') {
                    await channel.send(
                        'You cannot enter the raffle with 0 ticket'
                    );
                    return;
                }
                const currEntry = Number(arg) || 1;
                const prevEntry =
                    currentEntries.filter(([, uid]) => uid === author.id)
                        ?.length || 0;
                if (!Number.isInteger(currEntry) || currEntry < 1) {
                    await channel.send(
                        'Tickets entered should be a positive integer'
                    );
                    return;
                }
                if (currEntry + prevEntry > raffle.maxEntries) {
                    await channel.send(
                        `You have already entered with ${prevEntry} ticket(s), the max entires allowance per person for this raffle is ${
                            raffle.maxEntries
                        } ticket(s). You can only join with ${
                            raffle.maxEntries - prevEntry
                        } more ticket(s).`
                    );
                    return;
                }
                if (balance < currEntry * raffle.ticketCost) {
                    await channel.send(
                        `You don't have enough dice coins to enter with ${currEntry} ticket(s). The total cost for ${currEntry} ticket(s) is <:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                            currEntry * raffle.ticketCost
                        )}** but you have only <:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                            balance
                        )}**.`
                    );
                    return;
                }
                raffle.tickets = raffle.tickets || {};
                for (
                    let i = currentEntries.length;
                    i < currEntry + currentEntries.length;
                    i += 1
                ) {
                    raffle.tickets[i + 1] = author.id;
                }
                await ref.child('tickets').set(raffle.tickets);
                await database
                    .ref(`discord_bot/community/currency/${member.id}/balance`)
                    .set(balance - currEntry * raffle.ticketCost);
                await channel.send(
                    `You have entered the raffle with ${currEntry} ticket(s), costing you <:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                        currEntry * raffle.ticketCost
                    )}**${
                        prevEntry > 0
                            ? `, you now have a total of ${
                                  currEntry + prevEntry
                              } ticket(s)`
                            : '.'
                    }\nTicket Numbers: ${Object.entries(raffle.tickets ?? {})
                        .filter(([, uid]) => uid === author.id)
                        .map(([ticketNumber]) => `**${ticketNumber}**`)
                        .join(', ')}`
                );
            }
            return;
        case 'host': {
            if (
                !(
                    member.roles.cache.has('805772165394858015') ||
                    member.roles.cache.has('805000661133295616') ||
                    member.hasPermission('ADMINISTRATOR')
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
                await channel.send(
                    new Discord.MessageEmbed()
                        .setTitle('Command Parse Error')
                        .setColor('#ff0000')
                        .setDescription('usage of the command')
                        .addField(
                            'Hosting a raffle',
                            '`!raffle host <time> <ticketCost> [maxEntries default=1]`' +
                                '\n' +
                                'Example```!raffle host 12h30m 1000\n!raffle host 3d 500 4```'
                        )
                );
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
            await ref.set({
                endTimestamp: Date.now() + time,
                hostId: author.id,
                maxEntries,
                ticketCost,
            });
            announceWinner(guild);
            await channel.send(
                '<@&804544088153391124>',
                new Discord.MessageEmbed()
                    .setAuthor(
                        'randomdice.gg Server',
                        guild.iconURL({ dynamic: true }) ?? undefined
                    )
                    .setColor('#00ff00')
                    .setTitle('New Dice Coins Raffle')
                    .addField(
                        'Ticket Entries',
                        `<:Dice_TierX_Coin:813149167585067008> **${ticketCost} per ticket** (${maxEntries} max)`
                    )
                    .addField(
                        'Base Pool (10% of max entries)',
                        `<:Dice_TierX_Coin:813149167585067008> **${numberFormat.format(
                            ticketCost * maxEntries * 0.1
                        )}**`
                    )
                    .addField('Hosted by', `${author}`)
                    .setFooter('Raffle ends at')
                    .setTimestamp(Date.now() + time)
            );
            return;
        }
        case 'cancel':
            if (raffleTimeLeft < 0) {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#ff0000')
                        .setTitle('Dice Coins Raffle')
                        .setDescription(
                            'There is no active raffle at the moment'
                        )
                );
                return;
            }
            if (
                !(
                    member.roles.cache.has('805772165394858015') ||
                    member.roles.cache.has('805000661133295616') ||
                    member.hasPermission('ADMINISTRATOR')
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
                await channel.awaitMessages(
                    (newMessage: Discord.Message) =>
                        newMessage.author.id === author.id &&
                        newMessage.content.toLowerCase() === 'end',
                    { time: 60000, max: 1, errors: ['time'] }
                );
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
            await channel.send(
                new Discord.MessageEmbed()
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
                    )
            );
    }
}

export async function setTimerOnBoot(
    client: Discord.Client,
    database: firebase.database.Database
): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    if (!guild) return;
    announceWinner(guild);
}
