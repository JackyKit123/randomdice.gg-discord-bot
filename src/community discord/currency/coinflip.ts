import { database } from 'register/firebase';
import Discord from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { tier4RoleIds } from 'config/roleId';
import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import getBalance from './balance';
import isBotChannels from '../util/isBotChannels';

export default async function coinflip(
    message: Discord.Message
): Promise<void> {
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(message, '!coinflip', {
            default: 10 * 1000,
            donator: 5 * 1000,
        })
    )
        return;

    const { channel, content, author, member } = message;

    if (!member) return;
    const balance = await getBalance(message, 'emit new member');
    if (balance === false) return;
    const gambleProfile =
        cache['discord_bot/community/currency'][member.id]?.gamble;
    const [, headTail, amountArg] = content.split(' ');

    const isHead = headTail?.match(/^(heads?|h)$/i)?.[1];
    const isTail = headTail?.match(/^(tails?|t)$/i)?.[1];
    if (!isHead && !isTail) {
        await channel.send(
            'You must specify the face you choose, example```!coinflip head 500```'
        );
        return;
    }

    if (balance < 100) {
        await channel.send(
            `You do not even have ${coinDice} 100 to bet on a coinflip.`
        );
        return;
    }
    let amount = Number(amountArg);
    if (typeof amountArg === 'undefined') {
        amount = 100;
    } else if (member.roles.cache.hasAny(...tier4RoleIds)) {
        if (
            (!Number.isInteger(amount) && amountArg !== 'max') ||
            Number(amountArg) < 100
        ) {
            await channel.send(
                `You have to bet at least ${coinDice} 100 or \`max\`.`
            );
            return;
        }
        if (amountArg === 'max') {
            amount = balance;
        }
    } else if (
        !Number.isInteger(amount) ||
        Number(amountArg) < 100 ||
        Number(amountArg) > 10000
    ) {
        await channel.send(
            'Coinflip amount must be a integer between 100 - 10000'
        );
        return;
    }
    if (Number(amountArg) > balance) {
        await channel.send(
            'You cannot coinflip that much, you are not rich enough.'
        );
        return;
    }
    amount = amount || Number(amountArg);

    const flip = Math.random() < 0.5 ? 'head' : 'tail';
    const won = (flip === 'head' && isHead) || (flip === 'tail' && isTail);
    // eslint-disable-next-line no-nested-ternary
    const gainMultiplier = won
        ? isBotChannels(channel)
            ? 1
            : 0
        : isBotChannels(channel)
        ? -1
        : -10;
    await database
        .ref(`discord_bot/community/currency/${author.id}/balance`)
        .set(balance + amount * gainMultiplier);
    await database
        .ref(
            `discord_bot/community/currency/${author.id}/gamble/${
                won ? 'gain' : 'lose'
            }`
        )
        .set(
            Number(gambleProfile?.[won ? 'gain' : 'lose'] || 0) +
                Math.abs(amount * gainMultiplier)
        );
    await channel.send({
        embeds: [
            new Discord.MessageEmbed()
                .setAuthor({
                    name: author.tag,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                })
                .setColor(won ? '#99ff00' : '#ff0000')
                .setTitle(
                    `It is ${flip.toUpperCase()}!!! You ${
                        won ? 'Won' : 'Lost'
                    }!`
                )
                .setThumbnail(
                    flip === 'head'
                        ? 'https://e7.pngegg.com/pngimages/140/487/png-clipart-dogecoin-cryptocurrency-digital-currency-doge-mammal-cat-like-mammal.png'
                        : 'https://mpng.subpng.com/20180413/sge/kisspng-dogecoin-cryptocurrency-dash-digital-currency-doge-5ad13b0da01474.3329552115236615816557.jpg'
                )
                .setDescription(
                    `You ${
                        won ? 'won' : 'lost'
                    } ${coinDice} ${numberFormat.format(amount)}${
                        !isBotChannels(channel)
                            ? `\nBut since you're using this command in ${channel}, you ${
                                  won ? 'won' : 'lost'
                              } ${coinDice} ${numberFormat.format(
                                  Math.abs(gainMultiplier * amount)
                              )} instead\n<#${
                                  channelIds['💫 | VIP Channels']
                              }> <#${
                                  channelIds['🤖 | Bot Channels']
                              }> exist for a reason to let you to spam your commands.`
                            : ''
                    }`
                )
                .addField(
                    'Current Balance',
                    `${coinDice} ${numberFormat.format(
                        Number(balance) + amount * gainMultiplier
                    )}`
                ),
        ],
    });
}
