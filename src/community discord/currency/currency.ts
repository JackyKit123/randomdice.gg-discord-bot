import { database } from 'register/firebase';
import Discord from 'discord.js';
import cooldown from 'util/cooldown';
import fetchMentionString from 'util/fetchMention';
import checkPermission from 'community discord/util/checkPermissions';
import { eventManagerRoleIds } from 'config/roleId';
import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import getBalance from './balance';

export default async function currency(
    message: Discord.Message
): Promise<void> {
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(message, `!currency update`, {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    )
        return;

    const { channel, content, guild, member } = message;
    const [, amountArg, ...memberArgs] = content.split(' ');

    if (!guild || !(await checkPermission(message, eventManagerRoleIds)))
        return;

    const targetInList: string[] = [];
    const targets = (
        await Promise.all(
            memberArgs.every(
                arg =>
                    /^<@!?(\d{18})>$/.test(arg) ||
                    /^.+#(\d{4})/.test(arg) ||
                    /^\d{18}$/.test(arg)
            )
                ? memberArgs.map(arg => fetchMentionString(arg, guild))
                : [
                      fetchMentionString(memberArgs.join(' '), guild, {
                          content,
                          mentionIndex: 2,
                      }),
                  ]
        )
    ).filter(m => {
        if (typeof m === 'undefined' || targetInList.includes(m.id))
            return false;
        targetInList.push(m.id);
        return true;
    });

    const amount = Number(amountArg);
    if (Number.isNaN(amount) || !targets.length) {
        await channel.send(
            'Usage of the command `!currency <amount> <member | member member member...>`, example```!currency +5000 @JackyKit#0333 @fun guy#0069\n!currency -5000 I am a weird nickname```'
        );
        return;
    }
    if (!Number.isInteger(amount) || amount === 0) {
        await channel.send('The amount entered should be a non-zero integer.');
        return;
    }
    const botTargets = targets.filter(target => target?.user.bot);
    if (botTargets.length) {
        await channel.send(
            `${botTargets} ${
                botTargets.length > 1 ? 'are' : 'is'
            } bot user. You cannot audit the currency of bot users`
        );
        return;
    }
    if (amount > 50000 && !member.permissions.has('ADMINISTRATOR')) {
        await channel.send(
            `The audit amount is too large (> ${coinDice} 50,000), you need \`ADMINISTRATOR\` permission to enter that large amount.`
        );
        return;
    }

    await Promise.all(
        targets.map(async target => {
            const balance = await getBalance(message, 'silence', target);
            if (balance === false) return;
            await database
                .ref(`discord_bot/community/currency/${target?.id}/balance`)
                .set(balance + amount);
        })
    );

    const deduction = amount < 0;
    await channel.send({
        content: `You have ${
            deduction ? 'taken away' : 'given'
        } ${coinDice} ${numberFormat.format(Math.abs(amount))} ${
            deduction ? 'from' : 'to'
        } ${targets.join(' ')}`,
        allowedMentions: {
            parse: [],
            users: [],
            roles: [],
        },
    });
    const logChannel = guild.channels.cache.get(
        channelIds['jackykit-playground-v2']
    );
    if (logChannel?.isText()) {
        await logChannel.send({
            content: `${member} have ${
                deduction ? 'taken away' : 'given'
            } ${coinDice} ${numberFormat.format(Math.abs(amount))} ${
                deduction ? 'from' : 'to'
            } ${targets.join(' ')}`,
            allowedMentions: {
                parse: [],
                users: [],
                roles: [],
            },
        });
    }
}
