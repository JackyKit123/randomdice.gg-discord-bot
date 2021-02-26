import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import * as randomstring from 'randomstring';
import { promisify } from 'util';
import chatCoins from './chatCoins';
import cooldown from '../../helper/cooldown';
import getBalanced from './balance';
import cache, { Dice } from '../../helper/cache';

const wait = promisify(setTimeout);
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
            const str = randomstring.generate(5);
            memberChallengeState.set(member.id, 'challenging');
            await channel.send(
                `**ANTI-BOT Challenge**\nUnveil the spoiler in the embed and retype the string. Do not literally copy the text. Be aware that it is case sensitive.`,
                new Discord.MessageEmbed().setDescription(
                    `||${str
                        .split('')
                        .map(s => `${s}‎`)
                        .join('')}||`
                )
            );
            let tries = 10;
            const collector = channel.createMessageCollector(
                awaited => awaited.author.id === member.id,
                { max: 10, time: 30 * 10000 }
            );
            let completed = false;
            collector.on('collect', async msg => {
                tries -= 1;
                if (msg.content === str) {
                    memberChallengeState.set(member.id, 'none');
                    ddCasted.set(member.id, 0);
                    completed = true;
                    await channel.send('You may now continue.');
                    collector.stop();
                } else {
                    await channel.send(
                        `Incorrect Captcha, solve the captcha before you continue. You have **${tries}** ${
                            tries <= 1 ? 'try' : 'tries'
                        } left.`
                    );
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
    // <a:Dice_TierX_Rolling:814663188972699661>
    const embed = new Discord.MessageEmbed()
        .setAuthor(
            `${member.displayName}'s Dice Draw Game`,
            author.avatarURL({ dynamic: true }) ?? undefined
        )
        .setColor(outcome.color)
        .setDescription(`You earned <:Dice_TierX_Coin:813149167585067008> ????`)
        .addField('Your Draw is', '<a:Dice_TierX_Rolling:814663188972699661>');
    const sentMessage = await channel.send(embed);
    await wait(1000);
    await sentMessage.edit(
        (embed.setDescription(
            `You earned <:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                outcome.reward
            )}`
        ).fields = [
            {
                name: 'Your Draw is',
                value: emoji[randomDraw.id],
                inline: false,
            },
            {
                name: 'Current Balance',
                value: `<:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                    outcome.reward + balance
                )}`,
                inline: false,
            },
        ])
    );
    await chatCoins(message, true);
}
