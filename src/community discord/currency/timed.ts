import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import cache from '../../helper/cache';
import getBalance from './balance';
import parseMsIntoReadableText from '../../helper/parseMS';

export default async function timed(message: Discord.Message): Promise<void> {
    const { content, member, channel } = message;
    const app = firebase.app();
    const database = app.database();
    const numberFormat = new Intl.NumberFormat();

    const mode = content
        .toLowerCase()
        .match(/!(hourly|daily|weekly|monthly)/i)?.[1] as
        | undefined
        | 'hourly'
        | 'daily'
        | 'weekly'
        | 'monthly';
    const balance = await getBalance(message, 'emit new member');
    if (balance === false || !member) return;
    const memberProfile = cache['discord_bot/community/currency'][member.id];

    const now = new Date();
    const msNow = now.getMilliseconds();
    const secondsNow = now.getSeconds();
    const minutesNow = now.getMinutes();
    const hoursNow = now.getUTCHours();
    const dayNow = now.getUTCDay();
    const dateNow = now.getUTCDate();
    const monthNow = now.getMonth();
    const yearNow = now.getFullYear();

    async function cooldown(
        timestamp = 0,
        excess: number,
        cd: number
    ): Promise<boolean> {
        if (now.valueOf() - excess < timestamp) {
            await channel.send(
                new Discord.MessageEmbed()
                    .setTitle('Slow Down!')
                    .setColor('#6ba4a5')
                    .setDescription(
                        `Your command is still on \`${parseMsIntoReadableText(
                            cd - excess
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
                (now.valueOf() - (memberProfile.daily || 0)) /
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
                amount * (1 + multiplier + +0.1 * (streak - 1)) +
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
                `Added <:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                    amount * (1 + multiplier + +0.1 * (streak - 1))
                )} to your balance!`
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
                      `**${streak} streaks *(+${(streak - 1) * 10}% reward)***`
                  )
                : embed
        );
    }

    switch (mode) {
        case 'hourly':
            if (
                await cooldown(
                    memberProfile.hourly,
                    msNow + secondsNow * 1000 + minutesNow * 1000 * 60,
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
                    msNow +
                        secondsNow * 1000 +
                        minutesNow * 1000 * 60 +
                        hoursNow * 1000 * 60 * 60,
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
                    msNow +
                        secondsNow * 1000 +
                        minutesNow * 1000 * 60 +
                        hoursNow * 1000 * 60 * 60 +
                        dayNow * 1000 * 60 * 60 * 24,
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
                    msNow +
                        secondsNow * 1000 +
                        minutesNow * 1000 * 60 +
                        hoursNow * 1000 * 60 * 60 +
                        dateNow * 1000 * 60 * 60 * 24,
                    1000 *
                        60 *
                        60 *
                        24 *
                        new Date(yearNow, monthNow + 1, 0).getDate()
                )
            )
                return;
            await reward(10000);
            break;
        default:
    }
}
