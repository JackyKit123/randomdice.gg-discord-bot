import {
    ApplicationCommandData,
    Client,
    Collection,
    CommandInteraction,
    GuildMember,
    GuildTextBasedChannel,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageButton,
    MessageCollector,
    MessageComponentInteraction,
} from 'discord.js';
import { database } from 'register/firebase';
import { promisify } from 'util';
import logMessage from 'util/logMessage';
import rickBomb from 'community discord/currency/fun commands/rickbomb';
import { coinDice, goldenPickaxe, pickaxe } from 'config/emojiId';
import channelIds from 'config/channelIds';
import { suppressUnknownMessage } from 'util/suppressErrors';
import { getCommunityDiscord } from 'config/guild';
import { isProd } from 'config/env';
import { getBalance } from './balance';

const wait = promisify(setTimeout);
const numberFormat = new Intl.NumberFormat();
export const activeCoinbombInChannel = new Map<string, boolean>();

type BatchType = 'pick' | 'goldenPick' | 'small' | 'medium' | 'large';

export default async function pickCoins(
    client: Client,
    channel: GuildTextBasedChannel,
    recursive = false,
    type?: BatchType
): Promise<void> {
    try {
        const { guild } = channel;
        let rngMultiplier: number;
        switch (type) {
            case 'large':
                rngMultiplier = 5;
                break;
            case 'medium':
                rngMultiplier = 4;
                break;
            case 'small':
                rngMultiplier = 3;
                break;
            case 'pick':
            case 'goldenPick':
                rngMultiplier = 2;
                break;
            default: {
                const rand = Math.random();
                switch (true) {
                    case rand < 0.01:
                        rngMultiplier = 5;
                        break;
                    case rand < 0.11:
                        rngMultiplier = 4;
                        break;
                    case rand < 0.5:
                        rngMultiplier = 3;
                        break;
                    default:
                        rngMultiplier = 2;
                }
            }
        }
        const rngReward = Math.ceil(
            (Math.random() * 0.9 + 0.1) * 10 ** rngMultiplier
        );

        let content: string;
        let maxCollectorAllowed: number;
        let collectionTrigger: string;
        let endMessage: (
            members: Map<GuildMember, number>,
            goldenPickaxeUser?: boolean | string
        ) => string;
        let isGoldenPickaxe: boolean | string = false;
        const basicCollectionTriggers = [
            'GIMME',
            'MINE',
            'COINS',
            'PICK',
            'COLLECT',
            'ROB',
            'GRAB',
            'YOINK',
        ];
        const advancedCollectionTriggers = [
            'OMG Gimme all those money',
            'I need all those money',
            'PLZ COINS PLZ',
            'I am poor pls donate',
            'Gotta grab the coins this time',
            'Those are my money',
            'I am gonna yoink them all',
            'MONEY MONEY MONEY',
        ];
        const addInvisibleCharToString = (str: string): string =>
            str.replace(/\w/g, match => `‎${match}‎`);

        const uniqueChatters: string[] = [];
        [
            ...channel.messages.cache
                .filter(
                    msg =>
                        msg.author &&
                        !msg.author.bot &&
                        Date.now() - msg.createdTimestamp < 60 * 1000
                )
                .values(),
        ]
            .concat(
                channel.messages.cache
                    .filter(msg => msg.author && !msg.author.bot)
                    .last(10)
            )
            .forEach(msg => {
                if (!uniqueChatters.includes(msg.author.id))
                    uniqueChatters.push(msg.author.id);
            });

        const collected = new Map<GuildMember, number>();

        if (rngReward < 100) {
            isGoldenPickaxe = type === 'goldenPick' || Math.random() < 0.1;
            content = `A tiny batch of ${coinDice} ${numberFormat.format(
                rngReward
            )} has shown up, keep clicking ${pickaxe} to pick it\n${
                isGoldenPickaxe === true
                    ? `${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}**A GOLDEN PICKAXE HAS SPAWNED, PICK UP THE GOLDEN PICKAXE TO EARN 10X THE MINING REWARD**${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}${goldenPickaxe}\n`
                    : ''
            }`;
            maxCollectorAllowed = Infinity;
            collectionTrigger = pickaxe;
            endMessage = (members, goldenPickaxeUser): string =>
                [...members]
                    .map(
                        ([member, reward]) =>
                            `${member} has ${
                                goldenPickaxeUser === member.id
                                    ? goldenPickaxe
                                    : pickaxe
                            } up ${coinDice} ${numberFormat.format(reward)}`
                    )
                    .join('\n');
        } else if (rngReward < 1000) {
            maxCollectorAllowed = Math.ceil(uniqueChatters.length / 2);
            collectionTrigger =
                basicCollectionTriggers[
                    Math.floor(basicCollectionTriggers.length * Math.random())
                ];
            content = `💵💵 A batch of ${coinDice} ${numberFormat.format(
                rngReward
            )} has shown up, the first ${
                maxCollectorAllowed > 1
                    ? `${maxCollectorAllowed} people`
                    : 'person'
            } to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins. 💵💵`;
            endMessage = (members): string =>
                `💵💵 ${[...members.keys()].join(' ')} ${
                    members.size > 1 ? 'have' : 'has'
                } ${pickaxe} up the batch of ${coinDice} ${numberFormat.format(
                    rngReward
                )} 💵💵`;
        } else if (rngReward < 10000) {
            maxCollectorAllowed = Math.ceil(uniqueChatters.length / 10);
            collectionTrigger =
                basicCollectionTriggers[
                    Math.floor(basicCollectionTriggers.length * Math.random())
                ];
            content = `💰💰💰💰 A huge batch of ${coinDice} ${numberFormat.format(
                rngReward
            )} has shown up. The first ${
                maxCollectorAllowed > 1
                    ? `${maxCollectorAllowed} people`
                    : 'person'
            } to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins. 💰💰💰💰`;
            endMessage = (members): string =>
                `💰💰💰💰 ${[...members.keys()].join(' ')} ${
                    members.size > 1 ? 'have' : 'has'
                } ${pickaxe} up the huge batch of ${coinDice} ${numberFormat.format(
                    rngReward
                )} 💰💰💰💰`;
        } else {
            collectionTrigger =
                advancedCollectionTriggers[
                    Math.floor(
                        advancedCollectionTriggers.length * Math.random()
                    )
                ];
            content = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n${coinDice} ${numberFormat.format(
                rngReward
            )} has shown up.  The first one to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins.`;
            maxCollectorAllowed = 1;
            endMessage = (members): string =>
                `💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎\n ${[
                    ...members.keys(),
                ].join(' ')} ${
                    members.size > 1 ? 'have' : 'has'
                } ${pickaxe} up the huge batch of ${coinDice} ${numberFormat.format(
                    rngReward
                )} `;
        }

        const pickaxeButton = new MessageButton()
            .setEmoji(pickaxe)
            .setCustomId(pickaxe)
            .setStyle('PRIMARY');
        const goldenPickaxeButton = new MessageButton()
            .setEmoji(goldenPickaxe)
            .setCustomId(goldenPickaxe)
            .setStyle('PRIMARY');
        const getComponents = (goldenPickaxeAlert: typeof isGoldenPickaxe) =>
            collectionTrigger === pickaxe
                ? [
                      new MessageActionRow().addComponents(
                          goldenPickaxeAlert === true
                              ? [pickaxeButton, goldenPickaxeButton]
                              : [pickaxeButton]
                      ),
                  ]
                : [];
        const sentMessage = await channel.send({
            content,
            components: getComponents(isGoldenPickaxe),
        });
        activeCoinbombInChannel.set(channel.id, true);

        const onCollect = async (
            collector:
                | MessageCollector
                | InteractionCollector<MessageComponentInteraction>,
            collect: Message | MessageComponentInteraction
        ) => {
            try {
                const message =
                    collect instanceof Message ? collect : sentMessage;
                const member = guild.members.cache.get(
                    collect.member?.user.id || ''
                );
                if (!member) return;
                const memberHasReward = collected.get(member);
                if (
                    collected.size >= maxCollectorAllowed ||
                    (memberHasReward && collect instanceof Message)
                )
                    return;
                if (
                    !(
                        channel.messages.cache.some(
                            msg =>
                                msg.author && // msg author is nullable
                                msg.author.id === member.id &&
                                sentMessage.createdTimestamp -
                                    msg.createdTimestamp <
                                    1000 * 60 &&
                                msg.createdTimestamp <
                                    sentMessage.createdTimestamp
                        ) ||
                        channel.messages.cache
                            .filter(
                                msg =>
                                    msg.author && // msg author is nullable
                                    !msg.author?.bot &&
                                    msg.createdTimestamp <
                                        sentMessage.createdTimestamp
                            )
                            .last(10)
                            .some(msg => msg.author.id === member.id)
                    )
                ) {
                    await collect.reply({
                        content: `${member}, no sniping. You must be talking in ${channel} for the last 1 minute or had 1 message in the last 10 messages to earn the reward.`,
                        ephemeral: true,
                    });
                    return;
                }
                if (
                    collect instanceof MessageComponentInteraction &&
                    isGoldenPickaxe === true &&
                    collect.customId === goldenPickaxe
                ) {
                    isGoldenPickaxe = collect.user.id;
                }
                collected.set(
                    member,
                    (memberHasReward ?? 0) +
                        rngReward * (isGoldenPickaxe === member.id ? 10 : 1)
                );
                const balance = await getBalance(message, true, member);
                if (balance === null) return;
                await database
                    .ref(`discord_bot/community/currency/${member.id}/balance`)
                    .set(
                        balance +
                            rngReward * (isGoldenPickaxe === member.id ? 10 : 1)
                    );
                if (!(collect instanceof Message)) {
                    await collect.update({
                        content: `${
                            typeof isGoldenPickaxe === 'string'
                                ? content.replace(
                                      /${goldenPickaxe}.*${goldenPickaxe}/,
                                      `<@${isGoldenPickaxe}> has picked up the ${goldenPickaxe}, earning 10x the mining speed!`
                                  )
                                : content
                        }${endMessage(collected, isGoldenPickaxe)}`,
                        components: getComponents(isGoldenPickaxe),
                    });
                } else if (rngReward < 1000 && rngReward >= 100) {
                    await collect.react(coinDice);
                } else if (rngReward > 1000) {
                    await channel.send(
                        `${member} has collected the prize of ${coinDice} ${numberFormat.format(
                            rngReward
                        )}. Congratulations!`
                    );
                }
                if (collected.size >= maxCollectorAllowed) {
                    collector.stop();
                }
            } catch (err) {
                await logMessage(client, 'warning', err);
            }
        };
        const onEnd = async (
            collector: Collection<string, MessageComponentInteraction> | void
        ) => {
            activeCoinbombInChannel.set(channel.id, false);
            if (collected.size === 0) {
                if (collector) {
                    await wait(1000);
                    await sentMessage.edit({
                        content,
                        components: [],
                    });
                }
                await channel.send(
                    `🙁 Looks like no one has claimed the batch of ${coinDice} ${numberFormat.format(
                        rngReward
                    )} this time.`
                );
            } else {
                await wait(1000);
                await sentMessage
                    .edit({
                        content: endMessage(collected, isGoldenPickaxe),
                        components: [],
                    })
                    .catch(suppressUnknownMessage);
            }

            if (!recursive) return;
            const messageTimeout = new Map<string, boolean>();
            await channel.awaitMessages({
                filter: (newMessage: Message) => {
                    if (
                        activeCoinbombInChannel.get(channel.id) ||
                        messageTimeout.get(newMessage.author.id) ||
                        newMessage.author?.bot
                    )
                        return false;
                    messageTimeout.set(newMessage.author.id, true);
                    setTimeout(
                        () => messageTimeout.set(newMessage.author.id, false),
                        15 * 1000
                    );
                    return true;
                },
                max: 20,
            });
            pickCoins(client, channel, true);
        };

        if (collectionTrigger === pickaxe) {
            const collector = sentMessage
                .createMessageComponentCollector({
                    filter: interaction => !interaction.user.bot,
                    time: 20 * 1000,
                })
                .on('end', onEnd);
            collector.on('collect', interaction =>
                onCollect(collector, interaction)
            );
        } else {
            const collector = channel.createMessageCollector({
                filter: (message: Message) =>
                    !message.author?.bot &&
                    message.content.toLowerCase() ===
                        collectionTrigger.toLowerCase(),
                time: 20 * 1000,
            });
            collector
                .on('collect', message => onCollect(collector, message))
                .on('end', () => onEnd());
        }
    } catch (err) {
        await logMessage(client, 'warning', err);
    }
}

export async function pickCoinsInit(client: Client): Promise<void> {
    const guild = getCommunityDiscord(client);
    const channel = guild?.channels.cache.get(
        isProd
            ? channelIds.general // #general
            : channelIds['jackykit-playground-v2'] // #jackykit-playground
    );

    if (channel?.type !== 'GUILD_TEXT' || !channel?.isText()) {
        return;
    }
    if (isProd) {
        await wait(
            (
                await channel.messages.fetch({ limit: 50 })
            ).filter(msg => Date.now() - msg.createdTimestamp > 1000 * 60 * 5)
                .size *
                1000 *
                3
        );
    }
    pickCoins(client, channel, true);
}

export async function spawnCoinbomb(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, options, channel, user } = interaction;
    if (!channel) return;

    const arg = options.getString('type');

    if (activeCoinbombInChannel.get(channel.id)) {
        await interaction.reply(
            'There is an active coinbomb in this channel, you cannot spawn a new one before the last one has ended.'
        );
        return;
    }

    let type: BatchType | undefined;

    await interaction.reply(`${user} has spawned a coinbomb!`);
    switch (arg?.toLowerCase()) {
        case goldenPickaxe:
        case 'goldenpick':
            type = 'goldenPick';
            break;
        case '⛏️':
            type = 'pick';
            break;
        case '💵':
            type = 'small';
            break;
        case '💰':
            type = 'medium';
            break;
        case '💎':
            type = 'large';
            break;
        case 'rick':
            await rickBomb(interaction, false);
            return;
        default:
    }

    await pickCoins(client, channel, false, type);
}

export const commandData: ApplicationCommandData = {
    name: 'coinbomb',
    description: 'Spawns a coinbomb',
    defaultPermission: false,
    options: [
        {
            name: 'type',
            description: 'The type of coinbomb to spawn',
            type: 'STRING',
            required: false,
            choices: [
                {
                    name: '⛏️ Pickers',
                    value: '⛏️',
                },
                {
                    name: '⛏️ Golden Pickaxe',
                    value: 'goldenpick',
                },
                {
                    name: '💵 Small',
                    value: '💵',
                },
                {
                    name: '💰 Medium',
                    value: '💰',
                },
                {
                    name: '💎 Large',
                    value: '💎',
                },
                {
                    name: 'RICK, you know what it is',
                    value: 'rick',
                },
            ],
        },
    ],
};
