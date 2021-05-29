import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import * as randomstring from 'randomstring';
import * as math from 'mathjs';
import { promisify } from 'util';
import chatCoins from './chatCoins';
import cooldown from '../../util/cooldown';
import getBalanced from './balance';
import cache, { Dice } from '../../util/cache';

const wait = promisify(setTimeout);
const ddIntervals = new Map<string, number[]>();
const memberChallengeState = new Map<string, 'none' | 'challenging' | 'ban'>();
export default async function drawDice(
    message: Discord.Message
): Promise<void> {
    const app = firebase.app();
    const database = app.database();
    const { member, channel, guild, author } = message;
    if (!guild || !member) return;
    const numberFormat = new Intl.NumberFormat();
    const challenged = memberChallengeState.get(member.id) || 0;
    if (challenged === 'ban' || challenged === 'challenging') return;
    const balance = await getBalanced(message, 'emit new member');
    if (balance === false) return;
    const nextDD = channel.createMessageCollector(
        awaited =>
            awaited.author.id === member.id &&
            /^\w{5}$|^dd\b|^!drawdice\b|^!dicedraw\b/i.test(awaited.content),
        { time: 10 * 10000, max: 1 }
    );
    const lastDDTime = Date.now();
    nextDD.on('collect', () => {
        const interval = Date.now() - lastDDTime;
        const memberDDintervals = ddIntervals.get(member.id) || [];
        ddIntervals.set(
            member.id,
            interval > 10 * 1000 ? [] : [...memberDDintervals, interval]
        );
    });
    if (
        await cooldown(message, `!drawdice`, {
            default: 3.5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }
    const memberDDintervals = ddIntervals.get(member.id) || [];
    if (memberDDintervals.length >= 20) {
        if (math.std(memberDDintervals) > 100) {
            ddIntervals.set(member.id, memberDDintervals.slice(1, 20));
        } else {
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
            const collector = channel.createMessageCollector(
                awaited => awaited.author.id === member.id,
                { time: 30 * 10000 }
            );
            let failure = 0;
            collector.on('collect', async msg => {
                if (msg.content === str) {
                    failure = 0;
                    await channel.send('You may now continue.');
                    collector.stop();
                } else if (
                    /^\w{5}$|^dd\b|^!drawdice\b|^!dicedraw\b/i.test(msg.content)
                ) {
                    if (failure === 10) {
                        collector.stop();
                        return;
                    }
                    failure += 1;
                    await channel.send(
                        `Incorrect Captcha, solve the captcha before you continue. You have **${
                            10 - failure
                        }** ${10 - failure <= 1 ? 'try' : 'tries'} left.`
                    );
                }
            });
            collector.on('end', async () => {
                if (failure > 0) {
                    memberChallengeState.set(member.id, 'ban');
                    await channel.send('You failed the verification.');
                } else {
                    // no failure captcha detected, prob afk
                    memberChallengeState.set(member.id, 'none');
                    ddIntervals.set(member.id, []);
                }
            });
            setTimeout(async () => {
                if (failure > 0)
                    await message.reply(
                        'You have 10 seconds left to complete your captcha',
                        new Discord.MessageEmbed().setDescription(
                            `||${str
                                .split('')
                                .map(s => `${s}‎`)
                                .join('')}||`
                        )
                    );
            }, 1000 * 30);
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
    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${member.displayName}'s Dice Draw Game`,
            author.avatarURL({ dynamic: true }) ?? undefined
        )
        .setDescription(`You earned <:dicecoin:839981846419079178> ????`)
        .addField('Your Draw is', '<:Dice_TierX_Null:807019807312183366>');
    const sentMessage = await channel.send(embed);
    await wait(1000);
    embed = embed
        .setDescription(
            `You earned <:dicecoin:839981846419079178> ${numberFormat.format(
                outcome.reward
            )}`
        )
        .setColor(outcome.color);
    embed.fields = [
        {
            name: 'Your Draw is',
            value: `${emoji[randomDraw.id]}\n*${
                dice.find(d => d.id === randomDraw.id)?.name
            }*`,
            inline: false,
        },
        {
            name: 'Current Balance',
            value: `<:dicecoin:839981846419079178> ${numberFormat.format(
                outcome.reward + balance
            )}`,
            inline: false,
        },
    ];
    await sentMessage.edit(embed);
    await chatCoins(message, true);
}
