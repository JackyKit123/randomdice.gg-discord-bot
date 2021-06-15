import firebase from 'firebase-admin';
import Discord from 'discord.js';
import getBalance from './balance';
import cooldown from '../../util/cooldown';

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

    const uid =
        memberArg.match(/^<@!?(\d{18})>$/)?.[1] ||
        memberArg.match(/^(\d{18})$/)?.[1];
    const target = uid
        ? await guild.members
              .fetch(uid)
              .then(u => u)
              .catch(err => {
                  if (err.message === 'Unknown User') {
                      return undefined;
                  }
                  throw err;
              })
        : guild.members.cache.find(
              m =>
                  typeof memberArg === 'string' &&
                  memberArg !== '' &&
                  (m.user.username.toLowerCase() === memberArg.toLowerCase() ||
                      `${m.user.username}#${m.user.discriminator}`.toLowerCase() ===
                          memberArg.toLowerCase() ||
                      (m.nickname !== null &&
                          content
                              .split(' ')
                              .slice(2)
                              .join(' ')
                              .toLowerCase()
                              .startsWith(m.nickname.toLowerCase())))
          );

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
        } <:dicecoin:839981846419079178> ${numberFormat.format(
            Math.abs(amount)
        )}${
            deduction ? ` from ${target.user.username}` : ''
        }, they now have  <:dicecoin:839981846419079178> ${numberFormat.format(
            balance + amount
        )}!`,
        {
            disableMentions: 'all',
        }
    );
}
