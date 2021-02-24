import * as firebase from 'firebase-admin';
import * as Discord from 'discord.js';
import getBalance from './balance';
import cooldown from '../../helper/cooldown';

export default async function coinflip(
    message: Discord.Message
): Promise<void> {
    const app = firebase.app();
    const database = app.database();
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(message, `!currency update`, {
            default: 2 * 1000,
            donator: 2 * 1000,
        })
    )
        return;

    const { channel, content, guild, member } = message;
    const [, amountArg, memberArg] = content.split(' ');

    if (
        !guild ||
        !(
            member?.roles.cache.has('804223928427216926') ||
            member?.roles.cache.has('807219483311603722') ||
            member?.roles.cache.has('805000661133295616') ||
            member?.roles.cache.has('805772165394858015') ||
            member?.hasPermission('ADMINISTRATOR')
        )
    ) {
        await channel.send('You are not eligible to use this command');
        return;
    }

    const target =
        guild.members.cache.find(
            m =>
                m.user.id === memberArg ||
                m.user.username.toLowerCase() === memberArg?.toLowerCase() ||
                (m.nickname || m.user.username).toLowerCase() ===
                    memberArg?.toLowerCase() ||
                `${m.user.username}#${m.user.discriminator}`.toLowerCase() ===
                    memberArg?.toLowerCase() ||
                m.user.id === memberArg?.match(/<@!?(\d{18})>/)?.[1]
        ) || (await guild.members.fetch(memberArg || ''));

    const amount = Number(amountArg);
    if (Number.isNaN(amount) || !target) {
        await channel.send(
            'Usage of the command `!currency <amount> <member>`, example```!currency +5000 @JackyKit#0333```'
        );
        return;
    }
    if (!Number.isInteger(amount) || amount === 0) {
        await channel.send('The amount entered should be a non-zero integer.');
        return;
    }
    const balance = (await getBalance(message, 'silence', target)) as number;

    const deduction = amount < 0;

    await database
        .ref(`discord_bot/community/currency/${target.id}/balance`)
        .set(balance + amount);
    await channel.send(
        `You have ${
            deduction ? 'taken away' : `given ${target.user.username}`
        } <:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
            Math.abs(amount)
        )}${
            deduction ? ` from ${target.user.username}` : ''
        }, they now have  <:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
            balance + amount
        )}!`
    );
}
