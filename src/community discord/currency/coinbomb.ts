import {
    Client,
    Collection,
    DiscordAPIError,
    GuildMember,
    InteractionCollector,
    Message,
    MessageActionRow,
    MessageButton,
    MessageCollector,
    MessageComponentInteraction,
    NewsChannel,
    TextChannel,
} from 'discord.js';
import firebase from 'firebase-admin';
import { promisify } from 'util';
import logMessage from '../../dev-commands/logMessage';
import getBalance from './balance';
import rickBomb from './fun commands/rickbomb';

const wait = promisify(setTimeout);
const numberFormat = new Intl.NumberFormat();
export const activeCoinbombInChannel = new Map<string, boolean>();
let database: firebase.database.Database;

type BatchType = 'pick' | 'goldenPick' | 'small' | 'medium' | 'large';

export default async function pickCoins(
    client: Client,
    channel: TextChannel | NewsChannel,
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
        let goldenPickaxe: boolean | string = false;
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
            goldenPickaxe = type === 'goldenPick' || Math.random() < 0.1;
            content = `A tiny batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                rngReward
            )} has shown up, keep clicking <:pickaxe:898343065511665695> to pick it\n${
                goldenPickaxe === true
                    ? `<a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785>**A GOLDEN PICKAXE HAS SPAWNED, PICK UP THE GOLDEN PICKAXE TO EARN 10X THE MINING REWARD**<a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785><a:golden_pickaxe:898329291786440785>\n`
                    : ''
            }`;
            maxCollectorAllowed = Infinity;
            collectionTrigger = '<:pickaxe:898343065511665695>';
            endMessage = (members, goldenPickaxeUser): string =>
                [...members]
                    .map(
                        ([member, reward]) =>
                            `${member} has ${
                                goldenPickaxeUser === member.id
                                    ? '<a:golden_pickaxe:898329291786440785>'
                                    : '<:pickaxe:898343065511665695>'
                            } up <:dicecoin:839981846419079178> ${numberFormat.format(
                                reward
                            )}`
                    )
                    .join('\n');
        } else if (rngReward < 1000) {
            maxCollectorAllowed = Math.ceil(uniqueChatters.length / 2);
            collectionTrigger =
                basicCollectionTriggers[
                    Math.floor(basicCollectionTriggers.length * Math.random())
                ];
            content = `💵💵 A batch of <:dicecoin:839981846419079178> ${numberFormat.format(
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
                } <:pickaxe:898343065511665695> up the batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )} 💵💵`;
        } else if (rngReward < 10000) {
            maxCollectorAllowed = Math.ceil(uniqueChatters.length / 10);
            collectionTrigger =
                basicCollectionTriggers[
                    Math.floor(basicCollectionTriggers.length * Math.random())
                ];
            content = `💰💰💰💰 A huge batch of <:dicecoin:839981846419079178> ${numberFormat.format(
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
                } <:pickaxe:898343065511665695> up the huge batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )} 💰💰💰💰`;
        } else {
            collectionTrigger =
                advancedCollectionTriggers[
                    Math.floor(
                        advancedCollectionTriggers.length * Math.random()
                    )
                ];
            content = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n<:dicecoin:839981846419079178> ${numberFormat.format(
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
                } <:pickaxe:898343065511665695> up the huge batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )} `;
        }

        const pickaxeButton = new MessageButton()
            .setEmoji('<:pickaxe:898343065511665695>')
            .setCustomId('<:pickaxe:898343065511665695>')
            .setStyle('PRIMARY');
        const goldenPickaxeButton = new MessageButton()
            .setEmoji('<a:golden_pickaxe:898329291786440785>')
            .setCustomId('<a:golden_pickaxe:898329291786440785>')
            .setStyle('PRIMARY');
        const getComponents = (goldenPickaxeAlert: typeof goldenPickaxe) =>
            collectionTrigger === '<:pickaxe:898343065511665695>'
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
            components: getComponents(goldenPickaxe),
        });
        activeCoinbombInChannel.set(channel.id, true);

        const onCollect = async (
            collector:
                | MessageCollector
                | InteractionCollector<MessageComponentInteraction>,
            collect: Message | MessageComponentInteraction
        ) => {
            const message = collect instanceof Message ? collect : sentMessage;
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
                            msg.author.id === member.id &&
                            sentMessage.createdTimestamp -
                                msg.createdTimestamp <
                                1000 * 60 &&
                            msg.createdTimestamp < sentMessage.createdTimestamp
                    ) ||
                    channel.messages.cache
                        .filter(
                            msg =>
                                msg.author &&
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
                goldenPickaxe === true &&
                collect.customId === '<a:golden_pickaxe:898329291786440785>'
            ) {
                goldenPickaxe = collect.user.id;
            }
            collected.set(
                member,
                (memberHasReward ?? 0) +
                    rngReward * (goldenPickaxe === member.id ? 10 : 1)
            );
            const balance = await getBalance(message, 'silence', member);
            if (balance === false) return;
            await database
                .ref(`discord_bot/community/currency/${member.id}/balance`)
                .set(
                    balance + rngReward * (goldenPickaxe === member.id ? 10 : 1)
                );
            if (!(collect instanceof Message)) {
                await collect.update({
                    content: `${
                        typeof goldenPickaxe === 'string'
                            ? content.replace(
                                  /<a:golden_pickaxe:898329291786440785>.*<a:golden_pickaxe:898329291786440785>/,
                                  `<@${goldenPickaxe}> has picked up the <a:golden_pickaxe:898329291786440785>, earning 10x the mining speed!`
                              )
                            : content
                    }${endMessage(collected, goldenPickaxe)}`,
                    components: getComponents(goldenPickaxe),
                });
            } else if (rngReward < 1000 && rngReward >= 100) {
                await collect.react('<:dicecoin:839981846419079178>');
            } else if (rngReward > 1000) {
                await channel.send(
                    `${member} has collected the prize of <:dicecoin:839981846419079178> ${numberFormat.format(
                        rngReward
                    )}. Congratulations!`
                );
            }
            if (collected.size >= maxCollectorAllowed) {
                collector.stop();
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
                    `🙁 Looks like no one has claimed the batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                        rngReward
                    )} this time.`
                );
            } else {
                try {
                    await wait(1000);
                    await sentMessage.edit({
                        content: endMessage(collected, goldenPickaxe),
                        components: [],
                    });
                } catch (err) {
                    if ((err as DiscordAPIError).message !== 'Unknown Message')
                        throw err;
                }
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

        if (collectionTrigger === '<:pickaxe:898343065511665695>') {
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
        await logMessage(client, (err as DiscordAPIError).stack);
    }
}

export async function pickCoinsInit(
    client: Client,
    db: firebase.database.Database
): Promise<void> {
    database = db;
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID || ''
    );
    const channel = guild.channels.cache.get(
        process.env.NODE_ENV === 'production'
            ? '804222694488932364' // #general
            : '804640084007321600' // #jackykit-playground
    );

    if (channel?.type !== 'GUILD_TEXT' || !channel?.isText()) {
        return;
    }
    if (process.env.NODE_ENV === 'production') {
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

export async function spawnCoinbomb(message: Message): Promise<void> {
    const { client, content, member, channel } = message;

    const arg = content.split(' ')[1];
    if (
        !member ||
        !(
            member.permissions.has('ADMINISTRATOR') ||
            member.roles.cache.has('805000661133295616') ||
            member.roles.cache.has('805772165394858015')
        ) ||
        channel?.type !== 'GUILD_TEXT'
    ) {
        await channel.send('You do not have permission to spawn a coinbomb');
        return;
    }
    if (!database) {
        throw new Error('Database is not ready');
    }
    if (activeCoinbombInChannel.get(channel.id)) {
        await channel.send(
            'There is an active coinbomb in this channel, you cannot spawn a new one before the last one has ended.'
        );
        return;
    }

    let type: BatchType | undefined;

    switch (arg?.toLowerCase()) {
        case '<a:golden_pickaxe:898329291786440785>':
        case 'goldenpick':
            type = 'goldenPick';
            break;
        case '<:pickaxe:898343065511665695>':
        case '⛏️':
        case ':pick:':
        case 'tiny':
            type = 'pick';
            break;
        case '💵':
        case ':dollar:':
        case 'small':
            type = 'small';
            break;
        case '💰':
        case ':moneybag:':
        case 'medium':
            type = 'medium';
            break;
        case '💎':
        case ':gem:':
        case 'big':
        case 'large':
        case 'huge':
            type = 'large';
            break;
        case 'rick':
            await rickBomb(message);
            return;
        default:
            if (
                /^<a?:[\w\d_]*(\d|\b|_)rick(\d|\b|_)[\w\d_]*:\d{18}>$/i.test(
                    arg
                )
            ) {
                await rickBomb(message);
                return;
            }
    }

    pickCoins(client, channel, false, type);
}
