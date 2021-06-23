import Discord from 'discord.js';
import { activeCoinbombInChannel } from '../pick';
import commandCost from './commandCost';
import cooldown from '../../../util/cooldown';

export default async function rickBomb(
    message: Discord.Message
): Promise<void> {
    const { guild, member, content, channel: originalChannel } = message;
    let channel = originalChannel;
    if (!guild || !member) {
        return;
    }
    const channelRegex = /^(?:<#(\d{18})>|(\d{18}))$/;
    const anotherChannelArg = content.split(' ')?.[1]?.match(channelRegex);
    if (anotherChannelArg) {
        const getChannel = guild.channels.cache.get(anotherChannelArg?.[1]);
        if (getChannel?.isText()) {
            channel = getChannel;
        }
    }
    if (
        await cooldown(message, '!rickbomb', {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 1,
        })
    ) {
        return;
    }
    if (activeCoinbombInChannel.get(channel.id)) {
        await originalChannel.send(
            `There is an active coinbomb in ${channel}, you cannot spawn a new one before the last one has ended.`
        );
        return;
    }
    if (!(await commandCost(message, 500))) return;
    try {
        message.delete();
    } catch {
        // nothing
    }
    const rand = Math.random();
    let rngMultiplier: number;
    if (rand > 0.5) {
        rngMultiplier = 1;
    } else if (rand > 0.1) {
        rngMultiplier = 2;
    } else {
        rngMultiplier = 3;
    }

    let messageToSend: string;
    let maxCollectorAllowed: number;
    let collectionTrigger: string;
    let endMessage: (members: Discord.User[]) => string;
    const basicCollectionTriggers = [
        'GIMME',
        'MINE',
        'OMG',
        'PICK',
        'COLLECT',
        'ROB',
        'GRAB',
        'YOINK',
    ];
    const advancedCollectionTriggers = [
        'OMG Gimme It',
        'It can only be mine',
        'PLZ RICK PLZ',
        'Gotta grab it this time',
        'THIS IS MINE',
        'I am gonna yoink it',
        'OMG I WANT',
        'I LOVE U',
    ];
    const uniqueChatters: string[] = [];
    channel.messages.cache
        .filter(
            msg =>
                msg.author &&
                !msg.author.bot &&
                Date.now() - msg.createdTimestamp < 60 * 1000
        )
        .array()
        .concat(
            channel.messages.cache
                .filter(msg => msg.author && !msg.author.bot)
                .last(10)
        )
        .forEach(msg => {
            if (!uniqueChatters.includes(msg.author.id))
                uniqueChatters.push(msg.author.id);
        });

    if (rngMultiplier === 1) {
        maxCollectorAllowed = Math.ceil(uniqueChatters.length / 2);
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        messageToSend = `💵💵 A batch of <a:Dice_TierX_RickCoin:827059872810008616> Rick Roll videos has shown up, the first ${
            maxCollectorAllowed > 1 ? `${maxCollectorAllowed} people` : 'person'
        } to type \`${collectionTrigger}\` can watch them all. 💵💵`;
        endMessage = (members): string =>
            `<a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616> ${members.join(
                ' '
            )} ${
                members.length > 1 ? 'have' : 'has'
            } watched all those rick roll videos <a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616>`;
    } else if (rngMultiplier === 2) {
        maxCollectorAllowed = Math.ceil(uniqueChatters.length / 10);
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        messageToSend = `💰💰💰💰 A huge batch of <a:Dice_TierX_RickCoin:827059872810008616> Rick Astley selfies has shown up. The first ${
            maxCollectorAllowed > 1 ? `${maxCollectorAllowed} people` : 'person'
        } to type \`${collectionTrigger}\` can earn the selfies. 💰💰💰💰`;
        endMessage = (members): string =>
            `<a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616> ${members.join(
                ' '
            )} ${
                members.length > 1 ? 'have' : 'has'
            } ⛏️ up the huge batch of of Rick Astley selfies <a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616>`;
    } else {
        collectionTrigger =
            advancedCollectionTriggers[
                Math.floor(advancedCollectionTriggers.length * Math.random())
            ];
        messageToSend = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n<a:Dice_TierX_RickCoin:827059872810008616> Rick Astley himself has shown up. The first one to type \`${collectionTrigger}\` can earn the rick roll.`;
        maxCollectorAllowed = 1;
        endMessage = (members): string =>
            `<a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616><a:Dice_TierX_RickCoin:827059872810008616>\n ${members.join(
                ' '
            )} ${members.length > 1 ? 'have' : 'has'} earned the rick roll`;
    }

    const collected: Discord.User[] = [];
    const sentMessage = await channel.send(messageToSend);
    activeCoinbombInChannel.set(channel.id, true);
    const collector: Discord.Collector<
        Discord.Snowflake,
        Discord.Message
    > = channel.createMessageCollector(
        (m: Discord.Message) =>
            !m.author.bot &&
            m.content.toLowerCase() === collectionTrigger.toLowerCase(),
        {
            time: 20 * 1000,
        }
    );
    collector.on('collect', async (collect: Discord.Message) => {
        const { id } = collect.author;
        if (collected.some(user => user.id === id)) return;
        collected.push(collect.author);
        await collect.react('<a:Dice_TierX_RickCoin:827059872810008616>');
    });
    collector.on('end', async () => {
        activeCoinbombInChannel.set(channel.id, false);
        try {
            if (collected.length > 0) {
                await sentMessage.edit(endMessage(collected));
            } else {
                await sentMessage.delete();
            }
        } catch {
            // nothing
        }
    });
}
