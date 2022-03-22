import formatCoinText from 'community discord/util/formatCoinText';
import { coinDice, goldenPickaxe, pickaxe } from 'config/emojiId';
import {
    CommandInteraction,
    GuildMember,
    GuildTextBasedChannel,
    User,
} from 'discord.js';
import wait from 'util/wait';
import { activeCoinbombInChannel } from '.';
import {
    getCoinbombPickaxeButtons,
    BatchType,
    GoldenPick,
    getActiveChattingMemberCount,
    getRandomCollectionTrigger,
    nPeopleOrPerson,
    membersHasOrHave,
} from './util';

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
const getReward = (multiplier: number) =>
    Math.round((Math.random() * 0.9 + 0.1) * 10 ** multiplier);

async function spawnNext(channel: GuildTextBasedChannel) {
    const messageTimeout = new Set<User>();
    await channel.awaitMessages({
        filter: ({ author }) => {
            if (
                activeCoinbombInChannel.get(channel) ||
                messageTimeout.has(author) ||
                author.bot
            )
                return false;
            messageTimeout.add(author);
            wait(15 * 1000);
            messageTimeout.delete(author);
            return true;
        },
        max: 20,
    });
    while (activeCoinbombInChannel.has(channel)) {
        // eslint-disable-next-line no-await-in-loop
        await wait(100);
    }
    // eslint-disable-next-line no-use-before-define
    await spawnCoinbomb(channel);
}

export async function cleanUp(channel: GuildTextBasedChannel): Promise<void> {
    const activeCoinbomb = activeCoinbombInChannel.get(channel);
    if (!activeCoinbomb || activeCoinbomb === 'rick') return;
    const {
        rewarded,
        coinbombMessage,
        endMessage,
        reward,
        goldenPick,
        recursive,
    } = activeCoinbomb;

    activeCoinbombInChannel.delete(channel);

    if (rewarded.size === 0) {
        await coinbombMessage.reply(
            `🙁 Looks like no one has claimed the batch of ${coinDice} ${reward} this time.`
        );
    } else {
        await coinbombMessage.edit(endMessage(rewarded, goldenPick));
    }

    if (coinbombMessage.components.length) {
        await wait(1500);
        await coinbombMessage.edit({
            content: !rewarded.size
                ? coinbombMessage.content
                : endMessage(rewarded, goldenPick),
            components: [],
        });
    }

    if (recursive) await spawnNext(channel);
}

export default async function spawnCoinbomb(
    channel: GuildTextBasedChannel,
    interaction?: CommandInteraction<'cached'>,
    typeArg?: BatchType
): Promise<void> {
    let type: BatchType;
    const rand = Math.random();

    if (typeArg) {
        type = typeArg;
    } else if (rand < 0.01) {
        type = 'large';
    } else if (rand < 0.11) {
        type = 'medium';
    } else if (rand < 0.5) {
        type = 'small';
    } else {
        type = Math.random() < 0.1 ? goldenPickaxe : pickaxe;
    }

    let content = '';
    let reward = 0;
    let maxCollectorsAllowed = 0;
    let collectionTrigger = '';
    let endMessage: (
        members: Map<GuildMember, number>,
        goldenPickaxeUser?: GoldenPick
    ) => string = () => '';
    let goldenPick: GoldenPick = false;

    const activeChatters = await getActiveChattingMemberCount(channel.messages);

    switch (type) {
        case goldenPickaxe:
            goldenPick = 'awaiting to be picked up';
            content = `${goldenPickaxe.repeat(
                5
            )}**A GOLDEN PICKAXE HAS SPAWNED, PICK UP THE GOLDEN PICKAXE TO EARN 10X THE MINING REWARD**${goldenPickaxe.repeat(
                5
            )}`;
        // falls through
        case pickaxe:
            maxCollectorsAllowed = Infinity;
            reward = getReward(2);
            content = `A tiny batch of ${formatCoinText(
                reward
            )} has shown up, keep clicking ${pickaxe} to pick it\n${content}`;
            collectionTrigger = pickaxe;
            endMessage = (members, goldenPickaxeUser): string =>
                [...members]
                    .map(
                        ([member, memberReward]) =>
                            `${member} has ${
                                goldenPickaxeUser === member
                                    ? goldenPickaxe
                                    : pickaxe
                            } up ${formatCoinText(memberReward)}`
                    )
                    .join('\n');
            break;
        case 'small':
            maxCollectorsAllowed = Math.ceil(activeChatters / 2);
            collectionTrigger = getRandomCollectionTrigger(
                basicCollectionTriggers
            );
            reward = getReward(3);
            content = `💵💵 A batch of ${formatCoinText(
                reward
            )} has shown up, the first ${nPeopleOrPerson(
                maxCollectorsAllowed
            )} to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins. 💵💵`;
            endMessage = (members): string =>
                `💵💵 ${membersHasOrHave(
                    members
                )} ${pickaxe} up the batch of ${formatCoinText(reward)} 💵💵`;
            break;
        case 'medium':
            maxCollectorsAllowed = Math.ceil(activeChatters / 10);
            reward = getReward(4);
            collectionTrigger = getRandomCollectionTrigger(
                basicCollectionTriggers
            );
            content = `💰💰💰💰 A huge batch of ${formatCoinText(
                reward
            )} has shown up. The first ${nPeopleOrPerson(
                maxCollectorsAllowed
            )} to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins. 💰💰💰💰`;
            endMessage = (members): string =>
                `💰💰💰💰 ${membersHasOrHave(
                    members
                )} ${pickaxe} up the huge batch of ${formatCoinText(
                    reward
                )} 💰💰💰💰`;
            break;
        case 'large':
            maxCollectorsAllowed = 1;
            collectionTrigger = getRandomCollectionTrigger(
                advancedCollectionTriggers
            );
            reward = getReward(5);
            content = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n${formatCoinText(
                reward
            )} has shown up. The first ${nPeopleOrPerson(
                maxCollectorsAllowed
            )} to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the coins.`;
            endMessage = (members): string =>
                `💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎💎\n ${membersHasOrHave(
                    members
                )} ${pickaxe} up the gigantic batch of ${formatCoinText(
                    reward
                )} `;
            break;
        default:
    }

    const recursive = !interaction;
    const messageOption = {
        content,
        components: getCoinbombPickaxeButtons(type),
    };
    const coinbombMessage = await ((interaction &&
        interaction.reply({
            ...messageOption,
            fetchReply: true,
        })) ||
        channel.send(messageOption));
    activeCoinbombInChannel.set(channel, {
        rewarded: new Map(),
        type,
        coinbombMessage,
        maxCollectorsAllowed,
        reward,
        recursive,
        collectionTrigger,
        endMessage,
        goldenPick,
    });
    await wait(20 * 1000);

    await cleanUp(channel);
}
