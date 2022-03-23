import { coinDice, goldenPickaxe, pickaxe } from 'config/emojiId';
import { GuildMember, Message, MessageComponentInteraction } from 'discord.js';
import { database } from 'register/firebase';
import { activeCoinbombInChannel } from '.';
import { getBalance } from '../balance';
import { cleanUp } from './spawn';
import { getCoinbombPickaxeButtons } from './util';

export default async function claimCoinbomb(
    input: MessageComponentInteraction<'cached'> | Message<true>
): Promise<void> {
    const message = input instanceof Message ? input : input.message;
    const { channel, member } = input;
    if (!member || !channel) return;
    const { messages } = channel;
    const activeCoinbomb = activeCoinbombInChannel.get(channel);
    if (!activeCoinbomb || activeCoinbomb === 'rick') {
        if (input instanceof MessageComponentInteraction) {
            await input.update({
                content: message.content,
                components: [],
            });
        }
        return;
    }
    let { reward, goldenPick } = activeCoinbomb;
    const {
        type,
        rewarded,
        collectionTrigger,
        coinbombMessage,
        endMessage,
        maxCollectorsAllowed,
    } = activeCoinbomb;
    if (
        (input instanceof MessageComponentInteraction
            ? ![collectionTrigger, goldenPickaxe].includes(collectionTrigger)
            : input.content.toLowerCase() !==
              collectionTrigger.toLowerCase()) ||
        collectionTrigger === 'rick' // handles in rickbomb.ts
    )
        return;
    const memberRewarded = rewarded.get(member);
    if (rewarded.size >= maxCollectorsAllowed) return;
    if (
        memberRewarded &&
        (type === 'small' || type === 'medium' || type === 'large')
    )
        return;
    const memberHasSentMessageInLastMinute = messages.cache.some(
        ({ author, createdTimestamp }) =>
            author.id === member.id &&
            createdTimestamp > Date.now() - 60 * 1000 &&
            createdTimestamp < coinbombMessage.createdTimestamp
    );
    const memberHasSentMessageInLast10Messages = messages.cache
        .filter(
            ({ author, createdTimestamp }) =>
                !author.bot &&
                createdTimestamp < coinbombMessage.createdTimestamp
        )
        .last(10)
        .some(({ author }) => author.id === member.id);
    if (
        !memberHasSentMessageInLastMinute &&
        !memberHasSentMessageInLast10Messages
    ) {
        await input.reply({
            content: `${member}, no sniping. You must be talking in ${channel} for the last 1 minute or had 1 message in the last 10 messages to earn the reward.`,
            ephemeral: true,
        });
        return;
    }

    if (
        goldenPick === 'awaiting to be picked up' &&
        input instanceof MessageComponentInteraction &&
        input.customId === goldenPickaxe
    ) {
        goldenPick = member;
        activeCoinbomb.goldenPick = goldenPick;
        reward *= 10;
    } else if (goldenPick === member) {
        reward *= 10;
    }

    activeCoinbomb.rewarded.set(member, (memberRewarded ?? 0) + reward);
    activeCoinbombInChannel.set(channel, activeCoinbomb);

    const balance = await getBalance(input, true, member);
    if (balance === null) return;
    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + reward);

    switch (type) {
        case goldenPickaxe:
            if (input instanceof MessageComponentInteraction)
                await input.update({
                    content: `${
                        goldenPick instanceof GuildMember
                            ? `${goldenPick} has picked up the ${goldenPickaxe}, earning 10x the mining speed!\n`
                            : `${goldenPickaxe.repeat(
                                  5
                              )}**A GOLDEN PICKAXE HAS SPAWNED, PICK UP THE GOLDEN PICKAXE TO EARN 10X THE MINING REWARD**${goldenPickaxe.repeat(
                                  5
                              )}\n`
                    }${endMessage(rewarded, goldenPick)}`,
                    components: getCoinbombPickaxeButtons(channel),
                });
            break;
        case pickaxe:
            if (input instanceof MessageComponentInteraction)
                await input.update({
                    content: endMessage(rewarded),
                    components: getCoinbombPickaxeButtons(channel),
                });
            break;
        case 'small':
            await message.react(coinDice);
            break;
        case 'medium':
        case 'large':
            await channel.send(
                `${member} has collected the prize of ${coinDice} ${reward}. Congratulations!`
            );
            break;
        default:
    }
    if (rewarded.size >= maxCollectorsAllowed) await cleanUp(channel);
}
