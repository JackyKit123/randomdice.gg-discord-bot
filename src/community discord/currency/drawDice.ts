import Discord from 'discord.js';
import firebase from 'firebase-admin';
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
    let dice = [...cache.dice];
    let { diceDrawn, prestige } = cache['discord_bot/community/currency'][
        member.id
    ];
    const outcome = {
        reward: 0,
        color: '#999999',
        tier: 'Common' as Dice['rarity'],
    };
    diceDrawn = diceDrawn || {};
    prestige = prestige || 1;
    const drawnDice = new Array(prestige).fill('').map(() => {
        const tierRng = Math.floor(Math.random() * 100);
        if (tierRng < 60) {
            outcome.reward += 1;
            outcome.tier = 'Common';
        } else if (tierRng < 90) {
            outcome.reward += 10;
            outcome.tier = 'Rare';
            if (outcome.color === '#999999') {
                outcome.color = '006eff';
            }
        } else if (tierRng < 99) {
            outcome.reward += 40;
            outcome.tier = 'Unique';
            if (outcome.color !== '#ffdd00') {
                outcome.color = '#cc00ff';
            }
        } else {
            outcome.reward += 100;
            outcome.color = '#ffdd00';
            outcome.tier = 'Legendary';
        }
        const tierToDraw = dice.filter(die => die.rarity === outcome.tier);
        const randomDraw =
            tierToDraw[Math.floor(tierToDraw.length * Math.random())];
        dice = dice.filter(die => die.id !== randomDraw.id);
        if (diceDrawn) {
            diceDrawn[randomDraw.id] =
                Number(diceDrawn?.[randomDraw.id] || 0) + 1;
        }
        return randomDraw;
    });
    await database
        .ref(`discord_bot/community/currency/${member.id}/diceDrawn`)
        .set(diceDrawn);
    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + outcome.reward);
    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${member.displayName}'s Dice Draw Game`,
            author.avatarURL({ dynamic: true }) ?? undefined
        )
        .setDescription(`You earned <:dicecoin:839981846419079178> ????`)
        .addField(
            `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            '<:Dice_TierX_Null:807019807312183366> '.repeat(prestige)
        );
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
            name: `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            value: drawnDice.map(randomDraw => emoji[randomDraw.id]).join(' '),
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
