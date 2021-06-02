import * as Discord from 'discord.js';
import * as moment from 'moment';
import * as firebase from 'firebase-admin';
import cache from '../../util/cache';
import getBalance from './balance';
import parseMsIntoReadableText from '../../util/parseMS';

export default async function timed(message: Discord.Message): Promise<void> {
    const { content, member, channel } = message;
    const app = firebase.app();
    const database = app.database();
    const numberFormat = new Intl.NumberFormat();

    const mode = content
        .toLowerCase()
        .match(/!(hourly|daily|weekly|monthly|yearly)/i)?.[1] as
        | undefined
        | 'hourly'
        | 'daily'
        | 'weekly'
        | 'monthly'
        | 'yearly';
    const balance = await getBalance(message, 'emit new member');
    if (balance === false || !member) return;
    const memberProfile = cache['discord_bot/community/currency'][member.id];

    async function cooldown(
        timestamp = 0,
        endOf: moment.Moment,
        period: number
    ): Promise<boolean> {
        if (endOf.diff(timestamp) < period) {
            await channel.send(
                new Discord.MessageEmbed()
                    .setTitle('Slow Down!')
                    .setColor('#6ba4a5')
                    .setDescription(
                        `Your command is still on \`${parseMsIntoReadableText(
                            endOf.diff(moment())
                        )}\` cooldown.`
                    )
            );
            return true;
        }
        return false;
    }

    async function reward(amount: number): Promise<void> {
        let multiplier = 0;
        const rolesCache = (member as Discord.GuildMember).roles.cache;
        if (rolesCache.has('804512584375599154')) multiplier = 0.5;
        if (rolesCache.has('804513079319592980')) multiplier = 1;
        if (rolesCache.has('804513117228367882')) multiplier = 2;
        if (rolesCache.has('805727466219372546')) multiplier = 5;
        let streak = 1;
        if (mode === 'daily') {
            streak =
                (moment().valueOf() - (memberProfile.daily || 0)) /
                    (1000 * 60 * 60 * 24) <
                2
                    ? (memberProfile.dailyStreak || streak) + 1
                    : 1;
            await database
                .ref(
                    `discord_bot/community/currency/${
                        (member as Discord.GuildMember).id
                    }/dailyStreak`
                )
                .set(streak);
        }

        await database
            .ref(
                `discord_bot/community/currency/${
                    (member as Discord.GuildMember).id
                }/balance`
            )
            .set(
                amount * (1 + multiplier + 0.1 * Math.min(streak - 1, 100)) +
                    (balance as number)
            );
        await database
            .ref(
                `discord_bot/community/currency/${
                    (member as Discord.GuildMember).id
                }/${mode}`
            )
            .set(Date.now().valueOf());
        const embed = new Discord.MessageEmbed()
            .setTitle(`You claimed your ${mode} coins!`)
            .setColor('#ffff00')
            .setDescription(
                `Added <:dicecoin:839981846419079178> ${numberFormat.format(
                    amount * (1 + multiplier + +0.1 * Math.min(streak - 1, 100))
                )} to your balance!${
                    mode === 'yearly'
                        ? '\n||What? Are you seriously expecting more? Fine, come back another year for another <:dicecoin:839981846419079178> 1 reward.||'
                        : ''
                }`
            )
            .setFooter(
                multiplier > 0
                    ? `+extra ${multiplier * 100}% for being $${
                          multiplier * 10
                      } Patreon donator`
                    : ''
            );
        await channel.send(
            streak > 1
                ? embed.addField(
                      'Daily Streak',
                      `**${streak} streaks *(+${
                          Math.min(streak - 1, 100) * 10
                      }% reward)***`
                  )
                : embed
        );
        if (mode === 'daily') {
            if (streak === 100) {
                await member?.roles.add(
                    '847777372745105438',
                    '100 daily streaks'
                );
                await channel.send(
                    'Congratulation on achieving 100 daily streaks.',
                    new Discord.MessageEmbed()
                        .setDescription(`Added <@&847777372745105438> to you.`)
                        .setColor('#FFD700')
                );
            } else if (
                streak < 100 &&
                member?.roles.cache.has('847777372745105438')
            ) {
                await member?.roles.remove(
                    '847777372745105438',
                    'less than 100 daily streak'
                );
            }
        }
    }

    switch (mode) {
        case 'hourly':
            if (
                await cooldown(
                    memberProfile.hourly,
                    moment().endOf('hour'),
                    1000 * 60 * 60
                )
            )
                return;
            await reward(100);
            break;
        case 'daily':
            if (
                await cooldown(
                    memberProfile.daily,
                    moment().endOf('day'),
                    1000 * 60 * 60 * 24
                )
            )
                return;
            await reward(1000);
            break;
        case 'weekly':
            if (
                await cooldown(
                    memberProfile.weekly,
                    moment().endOf('week'),
                    1000 * 60 * 60 * 24 * 7
                )
            )
                return;
            await reward(5000);
            break;
        case 'monthly':
            if (
                await cooldown(
                    memberProfile.monthly,
                    moment().endOf('month'),
                    1000 * 60 * 60 * 24 * moment().daysInMonth()
                )
            )
                return;
            await reward(10000);
            break;
        case 'yearly':
            if (
                await cooldown(
                    memberProfile.yearly,
                    moment().endOf('year'),
                    1000 * 60 * 60 * 24 * (moment().isLeapYear() ? 366 : 365)
                )
            )
                return;
            await reward(1);
            break;
        default:
    }
}
