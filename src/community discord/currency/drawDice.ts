import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import * as randomstring from 'randomstring';
import chatCoins from './chatCoins';
import cooldown from '../../helper/cooldown';
import getBalanced from './balance';
import cache, { Dice } from '../../helper/cache';

const ddCasted = new Map<string, number>();
const memberChallengeState = new Map<string, 'none' | 'challenging' | 'ban'>();
export default async function drawDice(
    message: Discord.Message
): Promise<void> {
    const app = firebase.app();
    const database = app.database();
    const { member, channel, guild, author } = message;
    if (!guild || !member) return;
    const numberFormat = new Intl.NumberFormat();
    const challenged = memberChallengeState.get(member.id);
    if (challenged === 'ban') return;
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
    const memberDD = ddCasted.get(member.id) || 0;
    ddCasted.set(member.id, memberDD + 1);
    if (memberDD > 50) {
        const challenge = Math.random() < 0.05;
        if (challenge && challenged !== 'challenging') {
            const str = randomstring.generate(10);
            memberChallengeState.set(member.id, 'challenging');
            await channel.send(
                `**Challenge**\nUnveil the spoiler in the embed and retype the string. Do not literally copy the text. Be aware that it is case sensitive.`,
                new Discord.MessageEmbed().setDescription(
                    `||${str
                        .split('')
                        .map(s => `${s}‎`)
                        .join('')}||`
                )
            );
            const collector = channel.createMessageCollector(
                awaited => awaited.author.id === member.id,
                { max: 10, time: 30 * 10000 }
            );
            let completed = false;
            collector.on('collect', async msg => {
                if (msg.content === str) {
                    memberChallengeState.set(member.id, 'none');
                    ddCasted.set(member.id, 0);
                    completed = true;
                    await channel.send('You may now continue.');
                    collector.stop();
                }
            });
            collector.on('end', async () => {
                if (!completed) {
                    memberChallengeState.set(member.id, 'ban');
                    await channel.send('You failed the verification.');
                }
            });
            return;
        }
        if (challenged === 'challenging') {
            await channel.send('Finish the verification before you continue.');
            return;
        }
    }
    const emoji = cache['discord_bot/emoji'];
    const { dice } = cache;
    const diceDrawn =
        cache['discord_bot/community/currency'][member.id]?.diceDrawn;
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
    await database
        .ref(
            `discord_bot/community/currency/${member.id}/diceDrawn/${randomDraw.id}`
        )
        .set((diceDrawn?.[randomDraw.id] || 0) + 1);
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
