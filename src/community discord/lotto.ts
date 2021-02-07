import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import { parseStringIntoMs } from '../helper/parseMS';
import cache, { Lottery } from '../helper/cache';
import cooldown from '../helper/cooldown';

async function announceWinner(
    database: firebase.database.Database,
    guild: Discord.Guild
): Promise<void> {
    const channel = guild.channels.cache.get('807229757049012266');
    const ref = database.ref('discord_bot/community/lottery');
    if (channel?.type !== 'text') return;
    let lottery = (await ref.once('value')).val() as Lottery;
    if (!lottery.hostId) {
        return;
    }

    setTimeout(async () => {
        lottery = (await ref.once('value')).val() as Lottery;

        const entries = Object.entries(lottery.tickets ?? {});
        const uniqueEntry = {} as { [uid: string]: string };
        entries.forEach(([, uid]) => {
            if (!uniqueEntry[uid]) {
                uniqueEntry[uid] = uid;
            }
        });
        const winner =
            lottery.tickets[Math.ceil(Math.random() * entries.length)];
        await (channel as Discord.TextChannel).send(
            '<@&804544088153391124>',
            new Discord.MessageEmbed()
                .setAuthor(
                    'randomdice.gg Server',
                    guild.iconURL({ dynamic: true }) ?? undefined
                )
                .setColor('#800080')
                .setTitle('XP Lottery')
                .setDescription(
                    entries.length === 0
                        ? 'Lottery ended but no one entered the lottery.'
                        : `Lottery ended, **${
                              Object.keys(uniqueEntry).length
                          }** people entered the lottery with a total of **${
                              entries.length
                          }** tickets. <@${winner}> walked away grabbing **${
                              entries.length * lottery.ticketCost
                          } exp**. Congratulations!`
                )
                .setFooter('A new round of lottery will be hosted very soon')
        );
        await ref.set({
            endTimestamp: 0,
            hostId: 0,
            maxEntries: 0,
            ticketCost: 0,
        });
    }, Math.max(lottery.endTimestamp - Date.now(), 0));
}

export default async function lotto(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { channel, member, content, guild, author } = message;

    const [command, subcommand, arg, arg2, arg3] = content
        .split(' ')
        .map(word => word.trim());

    if (!member || !guild || command?.toLowerCase() !== '!lottery') return;

    if (channel.id !== '807229757049012266') {
        await channel.send(
            'You can only use this command in <#807229757049012266>'
        );
        return;
    }

    if (
        await cooldown(message, '!lottery', {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }

    const ref = database.ref('discord_bot/community/lottery');
    const lottery = cache['discord_bot/community/lottery'];
    const currentEntries = Object.entries(lottery.tickets ?? {});
    const lotteryTimeLeft = lottery.endTimestamp - Date.now();

    switch (subcommand?.toLowerCase()) {
        case 'info':
            if (lotteryTimeLeft > 0) {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#00ff00')
                        .setTitle('XP Lottery')
                        .addField(
                            'Ticket Entries',
                            `**${lottery.ticketCost} xp per ticket** (${lottery.maxEntries} ticket(s) max)`
                        )
                        .addField(
                            'Current Prize Pool',
                            `**${
                                currentEntries.length * lottery.ticketCost
                            } EXP** (${currentEntries.length} Tickets)`
                        )
                        .addField('Hosted by', `<@${lottery.hostId}>`)
                        .setFooter('Lottery ends at')
                        .setTimestamp(lottery.endTimestamp)
                );
            } else {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#ff0000')
                        .setTitle('XP Lottery')
                        .setDescription(
                            'There is no active lottery at the moment'
                        )
                );
            }
            return;
        case 'join':
            {
                if (lotteryTimeLeft < 0) {
                    await channel.send(
                        new Discord.MessageEmbed()
                            .setAuthor(
                                'randomdice.gg Server',
                                guild.iconURL({ dynamic: true }) ?? undefined
                            )
                            .setColor('#ff0000')
                            .setTitle('XP Lottery')
                            .setDescription(
                                'There is no active lottery at the moment'
                            )
                    );
                    return;
                }
                if (arg === '0') {
                    await channel.send(
                        'You cannot enter the lottery with 0 ticket'
                    );
                    return;
                }
                const currEntry = Number(arg) || 1;
                const prevEntry =
                    currentEntries.filter(([, uid]) => uid === author.id)
                        ?.length || 0;
                const logChannel = guild.channels.cache.get(
                    '806033486850162708'
                );
                if (logChannel?.type !== 'text') {
                    await channel.send(
                        'Error, <#806033486850162708> does not exist.'
                    );
                    return;
                }
                if (currEntry + prevEntry > lottery.maxEntries) {
                    await channel.send(
                        `You have already entered with ${prevEntry} ticket(s), the max entires allowance per person for this lottery is ${
                            lottery.maxEntries
                        } ticket(s). You can only join with ${
                            lottery.maxEntries - prevEntry
                        } more ticket(s).`
                    );
                    return;
                }
                lottery.tickets = lottery.tickets || {};
                for (
                    let i = currentEntries.length;
                    i < currEntry + currentEntries.length;
                    i += 1
                ) {
                    lottery.tickets[i + 1] = author.id;
                }
                await ref.child('tickets').set(lottery.tickets);
                await (logChannel as Discord.TextChannel).send(
                    `${author} entered the lottery with ${currEntry} ticket(s). Total exp deduction: ${
                        currEntry * lottery.ticketCost
                    }`
                );
                await channel.send(
                    `You have entered the lottery with ${currEntry} ticket(s)${
                        prevEntry > 0
                            ? `, you now have a total of ${
                                  currEntry + prevEntry
                              } ticket(s)`
                            : '.'
                    }\nTicket Numbers: ${Object.entries(lottery.tickets)
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
                    'You do not have permission to host a lottery.'
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
                            'Hosting a lottery',
                            '`!lottery host <time> <ticketCost> [maxEntries default=1]`' +
                                '\n' +
                                'Example```!lottery host 12h30m 1000\n!lottery host 3d 500 4```'
                        )
                );
                return;
            }
            if (maxEntries < 0 || maxEntries > 50) {
                await channel.send('Max entries should be between 0 - 50');
                return;
            }
            if (time > 604800000) {
                await channel.send('The duration for the lottery is too long.');
                return;
            }
            await ref.set({
                endTimestamp: Date.now() + time,
                hostId: author.id,
                maxEntries,
                ticketCost,
            });
            announceWinner(database, guild);
            await channel.send(
                '<@&804544088153391124>',
                new Discord.MessageEmbed()
                    .setAuthor(
                        'randomdice.gg Server',
                        guild.iconURL({ dynamic: true }) ?? undefined
                    )
                    .setColor('#00ff00')
                    .setTitle('New XP Lottery')
                    .addField(
                        'Ticket Entries',
                        `**${ticketCost} xp per ticket** (${maxEntries} max)`
                    )
                    .addField('Hosted by', `${author}`)
                    .setFooter('Lottery ends at')
                    .setTimestamp(Date.now() + time)
            );
            return;
        }
        case 'cancel':
            if (lotteryTimeLeft < 0) {
                await channel.send(
                    new Discord.MessageEmbed()
                        .setAuthor(
                            'randomdice.gg Server',
                            guild.iconURL({ dynamic: true }) ?? undefined
                        )
                        .setColor('#ff0000')
                        .setTitle('XP Lottery')
                        .setDescription(
                            'There is no active lottery at the moment'
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
                    'You do not have permission to cancel a lottery.'
                );
                return;
            }
            await channel.send(
                '⚠️ WARNING ⚠️\n Type `end` to cancel the lottery, the action is irreversible.'
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
                await channel.send(`${author} has cancelled the lottery.`);
            } catch {
                await channel.send(
                    "Ok, look's like we are not canceling the lottery today."
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
                        'Joining the lottery',
                        '`!lottery join [ticket Amount default=1]`' +
                            '\n' +
                            'Example```!lottery join\n!lottery join 10```'
                    )
                    .addField(
                        'Showing the info for current lottery',
                        '`!lottery info`\nExample```!lottery info```'
                    )
                    .addField(
                        'Hosting a lottery (requires Event Manager)',
                        '`!lottery host <time> <ticketCost> [maxEntries default=1]`' +
                            '\n' +
                            'Example```!lottery host 12h30m 1000\n!lottery host 3d 500 4```'
                    )
                    .addField(
                        'Canceling a lottery (requires Event Manager)',
                        '`!lottery cancel`' +
                            '\n' +
                            'Example```!lottery cancel```'
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
    announceWinner(database, guild);
}
