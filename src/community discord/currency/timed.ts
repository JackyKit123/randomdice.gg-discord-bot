import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import moment from 'moment';
import { database } from 'register/firebase';
import cache from 'util/cache';
import parseMsIntoReadableText from 'util/parseMS';
import { coinDice } from 'config/emojiId';
import roleIds from 'config/roleId';
import { getBalance } from './balance';
import isBotChannels from '../util/isBotChannels';

export default async function timed(
    interaction: CommandInteraction,
    mode: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, channel } = interaction;
    const numberFormat = new Intl.NumberFormat();

    const balance = await getBalance(interaction);
    if (balance === null || !channel) return;
    const memberProfile = cache['discord_bot/community/currency'][member.id];

    let timestamp = 0;
    let endOf: moment.Moment = moment();
    let period = 0;
    let reward = 0;
    let streak = 1;

    let multiplier = 0;
    const rolesCache = member.roles.cache;
    if (rolesCache.has(roleIds['$5 Patreon'])) multiplier = 0.5;
    if (rolesCache.has(roleIds['$10 Patreon'])) multiplier = 1;
    if (rolesCache.has(roleIds['$20 Patreon'])) multiplier = 2;
    if (rolesCache.has(roleIds['$50 Patreon'])) multiplier = 5;
    multiplier += 1;

    switch (mode) {
        case 'hourly':
            timestamp = memberProfile.hourly ?? 0;
            endOf = moment().endOf('hour');
            period = 1000 * 60 * 60;
            reward = 100 * multiplier;
            break;
        case 'daily':
            timestamp = memberProfile.daily ?? 0;
            endOf = moment().endOf('day');
            period = 1000 * 60 * 60 * 24;
            reward = 1000 * multiplier;
            break;
        case 'weekly':
            timestamp = memberProfile.weekly ?? 0;
            endOf = moment().endOf('week');
            period = 1000 * 60 * 60 * 24 * 7;
            reward = 5000 * multiplier;
            break;
        case 'monthly':
            timestamp = memberProfile.monthly ?? 0;
            endOf = moment().endOf('month');
            period = 1000 * 60 * 60 * 24 * moment().daysInMonth();
            reward = 10000 * multiplier;
            break;
        case 'yearly':
            timestamp = memberProfile.yearly ?? 0;
            endOf = moment().endOf('year');
            period = 1000 * 60 * 60 * 24 * (moment().isLeapYear() ? 366 : 365);
            reward = 1;
            break;
        default:
            timestamp = 0;
            endOf = moment();
            period = 0;
    }

    if (endOf.diff(timestamp) < period) {
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Slow Down!')
                    .setColor('#6ba4a5')
                    .setDescription(
                        `Your command is still on \`${parseMsIntoReadableText(
                            endOf.diff(moment())
                        )}\` cooldown.`
                    ),
            ],
        });
        return;
    }

    await database
        .ref(`discord_bot/community/currency/${member.id}/${mode}`)
        .set(Date.now().valueOf());
    let embed = new MessageEmbed()
        .setTitle(`You claimed your ${mode} coins!`)
        .setColor('#ffff00');
    if (multiplier > 1) {
        multiplier -= 1;
        embed = embed.setFooter({
            text: `+extra ${multiplier * 100}% for being $${
                multiplier * 10
            } Patreon donator`,
        });
    }

    if (mode === 'hourly') {
        streak =
            (moment().valueOf() - (memberProfile.hourly || 0)) / period < 2
                ? (memberProfile.hourlyStreak || 1) + 1
                : 1;
        await database
            .ref(`discord_bot/community/currency/${member.id}/hourlyStreak`)
            .set(streak);
        if (streak > 1) {
            reward *= streak;
            embed = embed.addField(
                'Hourly Streak',
                `**${streak} streaks *(x${streak}00% reward)***`
            );
        }
    }
    if (mode === 'daily') {
        streak =
            (moment().valueOf() - (memberProfile.daily || 0)) / period < 2
                ? (memberProfile.dailyStreak || 1) + 1
                : 1;
        await database
            .ref(`discord_bot/community/currency/${member.id}/dailyStreak`)
            .set(streak);
        if (streak > 1) {
            reward = Math.min(reward + 100 * (streak - 1), 11111);
            embed = embed.addField(
                'Daily Streak',
                `**${streak} streaks ${
                    streak > 111
                        ? '__(MAX 1111% REWARD)__'
                        : `*(+${streak - 1}0% reward)*`
                }**`
            );
        }
    }

    if (mode === 'yearly') {
        embed = embed
            .setDescription(
                `Added 1 ${coinDice} to your balance\n||What? Are you seriously expecting more? Fine, come back another year for another ${coinDice} 1 reward.||`
            )
            .setFooter(null);
    } else {
        embed = embed.setDescription(
            `Added ${coinDice} ${numberFormat.format(reward)} to your balance!`
        );
    }

    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + reward);

    const sentMessage = await interaction.reply({
        embeds: [embed],
        fetchReply: true,
        ephemeral: !isBotChannels(channel),
    });
    if (mode === 'daily') {
        if (streak === 100) {
            await member?.roles.add(
                roleIds['100 Daily Streaks'],
                '100 daily streaks'
            );
            await sentMessage.reply({
                content: `${member} Congratulation on achieving 100 daily streaks.`,
                embeds: [
                    new MessageEmbed()
                        .setDescription(
                            `Added <@&${roleIds['100 Daily Streaks']}> to you.`
                        )
                        .setColor('#FFD700'),
                ],
            });
        } else if (
            streak < 100 &&
            member?.roles.cache.has(roleIds['100 Daily Streaks'])
        ) {
            await member?.roles.remove(
                roleIds['100 Daily Streaks'],
                'less than 100 daily streak'
            );
        }
    }
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'hourly',
        description: 'Claim your hourly coins.',
    },
    {
        name: 'daily',
        description: 'Claim your daily coins.',
    },
    {
        name: 'weekly',
        description: 'Claim your weekly coins.',
    },
    {
        name: 'monthly',
        description: 'Claim your monthly coins.',
    },
    {
        name: 'yearly',
        description: 'Claim your yearly coins.',
    },
];
