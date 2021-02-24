import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import chatCoins from './chatCoins';
import cooldown from '../../helper/cooldown';
import getBalanced from './balance';
import cache, { Dice } from '../../helper/cache';

export default async function drawDice(
    message: Discord.Message
): Promise<void> {
    const app = firebase.app();
    const database = app.database();
    const { member, channel, guild, author } = message;
    if (!guild || !member) return;
    const numberFormat = new Intl.NumberFormat();
    const balance = await getBalanced(message, 'emit new member');
    if (balance === false) return;
    if (
        await cooldown(message, `!drawdice`, {
            default: 3.5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }
    const emoji = cache['discord_bot/emoji'];
    const { dice } = cache;
    let weighted = [] as Dice[];
    dice.forEach(die => {
        switch (die.rarity) {
            case 'Common':
                weighted = weighted.concat(new Array(100).fill(die));
                break;
            case 'Rare':
                weighted = weighted.concat(new Array(40).fill(die));
                break;
            case 'Unique':
                weighted = weighted.concat(new Array(10).fill(die));
                break;
            case 'Legendary':
                weighted = weighted.concat([die]);
                break;
            default:
        }
    });
    const randomDraw = weighted[Math.floor(Math.random() * weighted.length)];
    let outcome = {
        reward: 0,
        color: '',
    };
    switch (randomDraw.rarity) {
        case 'Common':
            outcome = {
                reward: 1,
                color: '#999999',
            };
            break;
        case 'Rare':
            outcome = {
                reward: 10,
                color: '#006eff',
            };
            break;
        case 'Unique':
            outcome = {
                reward: 40,
                color: '#cc00ff',
            };
            break;
        case 'Legendary':
            outcome = {
                reward: 100,
                color: '#ffdd00',
            };
            break;
        default:
    }

    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + outcome.reward);
    await channel.send(
        new Discord.MessageEmbed()
            .setAuthor(
                `${member.displayName}'s Dice Draw Game`,
                author.avatarURL({ dynamic: true }) ?? undefined
            )
            .setColor(outcome.color)
            .setDescription(
                `You earned <:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                    outcome.reward
                )}`
            )
            .addField('Your Draw is', emoji[randomDraw.id])
            .addField(
                'Current Balance',
                `<:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                    outcome.reward + balance
                )}`
            )
    );
    await chatCoins(message, true);
}
