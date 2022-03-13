import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { database } from 'register/firebase';
import * as randomstring from 'randomstring';
import * as math from 'mathjs';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import cache, { Dice } from 'util/cache';
import channelIds from 'config/channelIds';
import { coinDice, nullDice, shuffleDiceLegendary } from 'config/emojiId';
import { getBalance } from './balance';
import isBotChannels from '../util/isBotChannels';

const wait = promisify(setTimeout);
const ddTimestamp = new Map<string, number[]>();
const memberChallengeState = new Map<
    string,
    { captcha: string; message: Message; trialsLeft: number } | 'ban'
>();

export default async function drawDice(
    interaction: CommandInteraction | ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, channel, guild } = interaction;
    if (!channel) return;
    const numberFormat = new Intl.NumberFormat();
    let challengeState = memberChallengeState.get(member.user.id);
    if (challengeState === 'ban') return;
    if (challengeState) {
        challengeState.trialsLeft -= 1;
        if (challengeState.trialsLeft <= 0) {
            await interaction.deferReply();
            await interaction.deleteReply();
            return;
        }
        memberChallengeState.set(member.user.id, challengeState);
        await interaction.reply({
            components: challengeState.message.components,
            content: `${member} You are being challenged to solve the captcha, you have ${
                challengeState.trialsLeft
            } tr${
                challengeState.trialsLeft === 1 ? 'y' : 'ies'
            } left.\n\nPlease choose the button that says \`${
                challengeState.captcha
            }\`.`,
        });
        return;
    }
    const balance = await getBalance(interaction);
    if (balance === null) return;

    const memberDDtimestamp = ddTimestamp.get(member.id) || [];

    ddTimestamp.set(member.user.id, [...memberDDtimestamp, Date.now()]);

    if (
        await cooldown(interaction, `!drawdice`, {
            default: 3.5 * 1000,
            donator: 1 * 1000,
        })
    ) {
        return;
    }

    if (memberDDtimestamp.length >= 20) {
        const memberDDintervals = [];
        for (let i = 0; i < memberDDtimestamp.length - 1; i += 1) {
            memberDDintervals.push(
                memberDDtimestamp[i + 1] - memberDDtimestamp[i]
            );
        }

        if (math.std(memberDDintervals) > 600) {
            ddTimestamp.set(member.user.id, memberDDtimestamp.slice(1, 20));
        } else {
            const random5words = new Array(5)
                .fill('')
                .map(() => randomstring.generate(5));
            const captcha = random5words[Math.floor(Math.random() * 5)];

            const challengeMessage = await interaction.reply({
                content: `**ANTI-BOT Challenge**\nPress the button that says \`${captcha}\` in the next 30 seconds.`,
                allowedMentions: {
                    repliedUser: true,
                },
                components: [
                    new MessageActionRow().addComponents(
                        random5words.map(word =>
                            new MessageButton()
                                .setCustomId(`dd-captcha-${word}`)
                                .setLabel(word)
                                .setStyle('SECONDARY')
                        )
                    ),
                ],
                fetchReply: true,
            });

            challengeState = {
                captcha,
                message: challengeMessage,
                trialsLeft: 10,
            };
            memberChallengeState.set(member.user.id, challengeState);

            const tenSecondsLeftNotify = setTimeout(async () => {
                challengeState = memberChallengeState.get(member.user.id);
                if (challengeState && challengeState !== 'ban')
                    await channel.send({
                        content: `${member} You have 10 seconds left to choose the correct button that says \`${captcha}\`.`,
                        components: challengeMessage.components,
                    });
            }, 1000 * 20);

            const collector = channel
                .createMessageComponentCollector({
                    time: 30 * 1000,
                    max: 10,
                })
                .on('collect', async i => {
                    if (!i.customId.startsWith('dd-captcha-')) return;
                    if (i.user.id !== member.user.id) {
                        await i.reply('This challenge is not for you.');
                        return;
                    }
                    challengeState = memberChallengeState.get(member.user.id);
                    if (i.customId === `dd-captcha-${captcha}`) {
                        memberChallengeState.delete(member.user.id);
                        await i.reply('You may now continue.');
                        collector.stop('success');
                    } else if (challengeState && challengeState !== 'ban') {
                        challengeState.trialsLeft -= 1;
                        memberChallengeState.set(
                            member.user.id,
                            challengeState
                        );
                        if (challengeState.trialsLeft === 0) {
                            collector.stop();
                            return;
                        }
                        await i.reply({
                            content: `Incorrect button, solve the captcha before you continue. You have **${
                                challengeState.trialsLeft
                            }** ${
                                challengeState.trialsLeft <= 1 ? 'try' : 'tries'
                            } left to choose \`${captcha}\`.`,
                            components: challengeMessage.components,
                        });
                    }
                })
                .on('end', async (_, endReason) => {
                    // no failure captcha detected, prob afk
                    clearTimeout(tenSecondsLeftNotify);
                    if (endReason === 'success') {
                        memberChallengeState.delete(member.user.id);
                        ddTimestamp.delete(member.user.id);
                    } else {
                        memberChallengeState.set(member.user.id, 'ban');
                        await channel.send(
                            `${member} You failed the verification, are you temporarily banned from using this command.`
                        );
                    }
                });
            return;
        }
    }
    const emoji = cache['discord_bot/emoji'];
    let { dice } = cache;
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
    let embed = new MessageEmbed()
        .setAuthor({
            name: `${
                guild.members.cache.get(member.user.id)?.displayName ?? '???'
            }'s Dice Draw Game`,
            iconURL: guild.members.cache.get(member.user.id)?.displayAvatarURL({
                dynamic: true,
            }),
        })
        .setDescription(`You earned ${coinDice} ????`)
        .addField(
            `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            `${nullDice} `.repeat(prestige)
        )
        .addField(
            'Current Balance',
            `${coinDice} ${numberFormat.format(balance)}`
        );

    await interaction.reply({
        embeds: [embed],
    });

    await wait(1000);
    embed = embed
        .setDescription(
            `You ${
                isBotChannels(channel) ? 'earned' : 'lost'
            } ${coinDice} ${numberFormat.format(Math.abs(outcome.reward))}`
        )
        .setColor(outcome.color);
    embed.fields = [
        {
            name: `Your ${drawnDice.length > 1 ? 'Draws are' : 'Draw is'}`,
            value: isBotChannels(channel)
                ? drawnDice.map(randomDraw => emoji[randomDraw.id]).join(' ')
                : `${coinDice}${coinDice}${coinDice}${coinDice}${coinDice}**JACKPOT**${coinDice}${coinDice}${coinDice}${coinDice}${coinDice}\nYou lost ${coinDice} ${outcome.reward} instead since you are using this command in ${channel}\n<#${channelIds['💫 | VIP Channels']}> <#${channelIds['🤖 | Bot Channels']}> exist for a reason to let you to spam your commands.`,
            inline: false,
        },
        {
            name: 'Current Balance',
            value: `${coinDice} ${numberFormat.format(
                outcome.reward + balance
            )}`,
            inline: false,
        },
    ];

    const messageOption = {
        embeds: [embed],
        components: isBotChannels(channel)
            ? [
                  new MessageActionRow().addComponents([
                      new MessageButton()
                          .setCustomId('dd')
                          .setEmoji(shuffleDiceLegendary)
                          .setStyle('PRIMARY')
                          .setLabel('Draw Again'),
                  ]),
              ]
            : [],
    };

    await interaction.editReply(messageOption);
}

export const commandData: ApplicationCommandData = {
    name: 'dd',
    description: 'draw some dice for some coins',
};
