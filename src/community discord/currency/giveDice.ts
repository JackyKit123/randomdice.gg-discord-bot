import * as firebase from 'firebase-admin';
import * as Discord from 'discord.js';
import getBalance from './balance';
import cooldown from '../../helper/cooldown';
import cache from '../../helper/cache';

export default async function giveDice(
    message: Discord.Message
): Promise<void> {
    const app = firebase.app();
    const database = app.database();
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(message, `!giveDice`, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    )
        return;

    const { channel, content, guild, member } = message;
    const args = content.split(' ');
    const amount = args[1];
    const memberArg = args[args.length - 1];
    if (!guild || !member) return;

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
                          content.endsWith(m.nickname.toLowerCase())))
          );
    if (
        (await getBalance(message, 'emit new member')) === false ||
        (await getBalance(message, 'emit new member', target)) === false
    )
        return;

    const { dice } = cache;
    const emoji = cache['discord_bot/emoji'];
    const profile = cache['discord_bot/community/currency'][member.id];
    const die = dice.find(d =>
        args
            .slice(2, args.length)
            .join(' ')
            .toLowerCase()
            .startsWith(d.name.toLowerCase())
    );
    if (Number.isNaN(Number(amount)) || !die || !target) {
        await channel.send(
            'Usage of the command `!givedice <amount> <dice> <member>`, example```!givedice 10 mighty wind @JackyKit#0333```'
        );
        return;
    }
    const invAmount = profile?.diceDrawn?.[die.id] || 0;
    const targetProfile = cache['discord_bot/community/currency'][target.id];
    const targetInvAmount = targetProfile?.diceDrawn?.[die.id] || 0;
    if (target.id === member.id) {
        await channel.send('You cannot trade with yourself.');
        return;
    }
    if (Number(amount) < 1) {
        await channel.send('You cannot give less than 1 die.');
        return;
    }
    if (!Number.isInteger(Number(amount))) {
        await channel.send('The amount must be a positive integer.');
        return;
    }
    if (Number(amount) > invAmount) {
        await channel.send(
            `You only have ${invAmount} ${
                emoji[die.id]
            } , you can't share that many.`
        );
        return;
    }

    await database
        .ref(`discord_bot/community/currency/${target.id}/diceDrawn/${die.id}`)
        .set(targetInvAmount + Number(amount));
    await database
        .ref(`discord_bot/community/currency/${member.id}/diceDrawn/${die.id}`)
        .set(invAmount - Number(amount));
    await channel.send(
        `You have given ${numberFormat.format(Number(amount))} ${
            emoji[die.id]
        } to ${target.user.username}, they now have ${numberFormat.format(
            invAmount - Number(amount)
        )} ${emoji[die.id]} and you have ${numberFormat.format(
            targetInvAmount + Number(amount)
        )} ${emoji[die.id]}!`
    );
}
