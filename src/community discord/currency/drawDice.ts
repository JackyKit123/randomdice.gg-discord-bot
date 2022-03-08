import Discord, {
    Interaction,
    Message,
    MessageActionRow,
    MessageButton,
} from 'discord.js';
import { database } from 'register/firebase';
import * as randomstring from 'randomstring';
import * as math from 'mathjs';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import cache, { Dice } from 'util/cache';
import getBalanced from './balance';
import chatCoins from './chatCoins';
import isBotChannels from '../util/isBotChannels';

const wait = promisify(setTimeout);
const ddIntervals = new Map<string, number[]>();
const memberChallengeState = new Map<string, 'none' | 'challenging' | 'ban'>();
export default async function drawDice(
    input: Discord.Interaction | Discord.Message
): Promise<void> {
    const { member, channel, guild } = input;
    if (
        !guild ||
        !member ||
        !channel ||
        (input instanceof Interaction && !input.isButton())
    )
        return;
    const numberFormat = new Intl.NumberFormat();
    const challenged = memberChallengeState.get(member.user.id) || 0;
    if (challenged === 'ban' || challenged === 'challenging') return;
    const balance = await getBalanced(input, 'emit new member');
    if (balance === false) return;
    const nextDD = channel.createMessageCollector({
        filter: awaited =>
            awaited.author.id === member.user.id &&
            /^\w{5}$|^dd\b|^!drawdice\b|^!dicedraw\b/i.test(awaited.content),
        time: 10 * 10000,
        max: 1,
    });
    const lastDDTime = Date.now();
    nextDD.on('collect', () => {
        const interval = Date.now() - lastDDTime;
        const memberDDintervals = ddIntervals.get(member.user.id) || [];
        ddIntervals.set(
            member.user.id,
            interval > 10 * 1000 ? [] : [...memberDDintervals, interval]
        );
    });
    if (
        await cooldown(input, `!drawdice`, {
            default: 3.5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }
    const memberDDintervals = ddIntervals.get(member.user.id) || [];
    if (memberDDintervals.length >= 20) {
        if (math.std(memberDDintervals) > 100) {
            ddIntervals.set(member.user.id, memberDDintervals.slice(1, 20));
        } else {
            const str = randomstring.generate(5);
            memberChallengeState.set(member.user.id, 'challenging');
            await channel.send({
                content: `**ANTI-BOT Challenge**\nUnveil the spoiler in the embed and retype the string. Do not literally copy the text. Be aware that it is case sensitive.`,
                embeds: [
                    new Discord.MessageEmbed().setDescription(
                        `||${str
                            .split('')
                            .map(s => `${s}‎`)
                            .join('')}||`
                    ),
                ],
            });
            const collector = channel.createMessageCollector({
                filter: awaited => awaited.author.id === member.user.id,
                time: 30 * 10000,
            });
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
                    memberChallengeState.set(member.user.id, 'ban');
                    await channel.send('You failed the verification.');
                } else {
                    // no failure captcha detected, prob afk
                    memberChallengeState.set(member.user.id, 'none');
                    ddIntervals.set(member.user.id, []);
                }
            });
            setTimeout(async () => {
                if (failure > 0 && input instanceof Message)
                    await input.reply({
                        content:
                            'You have 10 seconds left to complete your captcha',
                        embeds: [
                            new Discord.MessageEmbed().setDescription(
                                `||${str
                                    .split('')
                                    .map(s => `${s}‎`)
                                    .join('')}||`
                            ),
                        ],
                    });
            }, 1000 * 30);
            return;
        }
    }
    const emoji = cache['discord_bot/emoji'];
    let dice = [...cache.dice];
    let { diceDrawn, prestige } =
        cache['discord_bot/community/currency'][member.user.id];
    const outcome: {
        reward: number;
        color: `#${string}`;
        tier: Dice['rarity'];
    } = {
        reward: 0,
        color: '#999999',
        tier: 'Common',
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
                outcome.color = '#006eff';
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

    outcome.reward *= isBotChannels(channel) ? 1 : -10;
    await database
        .ref(`discord_bot/community/currency/${member.user.id}/diceDrawn`)
        .set(diceDrawn);
    await database
        .ref(`discord_bot/community/currency/${member.user.id}/balance`)
        .set(balance + outcome.reward);
    let embed = new Discord.MessageEmbed()
        .setAuthor({
            name: `${
                guild.members.cache.get(member.user.id)?.displayName ?? '???'
            }'s Dice Draw Game`,
            iconURL: guild.members.cache.get(member.user.id)?.displayAvatarURL({
                dynamic: true,
            }),
        })
        .setDescription(`You earned <:dicecoin:839981846419079178> ????`)
        .addField(
            `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            '<:Dice_TierX_Null:807019807312183366> '.repeat(prestige)
        );

    const sentMessage = await (input instanceof Interaction
        ? input.reply({ embeds: [embed] })
        : channel.send({ embeds: [embed] }));
    await wait(1000);
    embed = embed
        .setDescription(
            `You ${
                isBotChannels(channel) ? 'earned' : 'lost'
            } <:dicecoin:839981846419079178> ${numberFormat.format(
                Math.abs(outcome.reward)
            )}`
        )
        .setColor(outcome.color);
    embed.fields = [
        {
            name: `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            value: isBotChannels(channel)
                ? drawnDice.map(randomDraw => emoji[randomDraw.id]).join(' ')
                : `<:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178>**JACKPOT**<:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178><:dicecoin:839981846419079178>\nYou lost <:dicecoin:839981846419079178> ${outcome.reward} instead since you are using this command in ${channel}\n<#805739701902114826> <#804227071765118976> exist for a reason to let you to spam your commands.`,
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

    const messageOption = {
        embeds: [embed],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('dd')
                    .setEmoji('<a:Dice_TierX_RandomLegend:867076479733334016>')
                    .setStyle('PRIMARY')
                    .setLabel('Draw Again'),
            ]),
        ],
    };

    if (sentMessage instanceof Message) {
        await sentMessage.edit(messageOption);
    } else if (input instanceof Interaction) {
        await input.editReply(messageOption);
    }

    if (input instanceof Message) await chatCoins(input, true);
}
