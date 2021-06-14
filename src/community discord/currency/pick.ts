import Discord from 'discord.js';
import firebase from 'firebase-admin';
import { promisify } from 'util';
import getBalance from './balance';

let guild: Discord.Guild;
let channel: Discord.TextChannel;
const wait = promisify(setTimeout);
export default async function pickCoins(
    client: Discord.Client,
    database: firebase.database.Database
): Promise<void> {
    if (!guild || !channel) {
        guild =
            guild ||
            (await client.guilds.fetch(process.env.COMMUNITY_SERVER_ID || ''));
        channel =
            channel ||
            guild.channels.cache.get(
                process.env.NODE_ENV === 'production'
                    ? '804222694488932364' // #general
                    : '804640084007321600' // #jackykit-playground
            );
        if (process.env.NODE_ENV === 'production') {
            await wait(
                (await channel.messages.fetch({ limit: 50 })).filter(
                    msg => Date.now() - msg.createdTimestamp > 1000 * 60 * 5
                ).size *
                    1000 *
                    3
            );
        }
    }
    const numberFormat = new Intl.NumberFormat();

    if (!channel?.isText()) {
        return;
    }

    const rngMultiplier =
        10 **
        Math.ceil(
            Math.max(Math.min(5, -Math.log(Math.random()) / Math.log(2.6)), 1)
        );
    const rngReward = Math.ceil(
        Math.max(Math.random(), 0.1) * rngMultiplier * 10
    );

    let content: string;
    let maxCollectorAllowed: number;
    let collectionTrigger: string;
    const basicCollectionTriggers = [
        'GIMME',
        'COINS',
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

    if (rngReward < 100) {
        content = `A reward of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up, react to \`⛏️\` to earn it`;
        maxCollectorAllowed = Infinity;
        collectionTrigger = 'reaction';
    } else if (rngReward < 1000) {
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        content = `💵💵 A reward of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up, the first 5 people to type \`${addInvisibleCharToString(
            collectionTrigger
        )}\` can earn the reward. 💵💵`;
        maxCollectorAllowed = 5;
    } else if (rngReward < 10000) {
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        content = `💰💰💰💰 A big reward of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up. The first one to type \`${addInvisibleCharToString(
            collectionTrigger
        )}\` can earn the reward. 💰💰💰💰`;
        maxCollectorAllowed = 1;
    } else {
        collectionTrigger =
            advancedCollectionTriggers[
                Math.floor(advancedCollectionTriggers.length * Math.random())
            ];
        content = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n<:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up.  The first one to type \`${addInvisibleCharToString(
            collectionTrigger
        )}\` can earn the reward.`;
        maxCollectorAllowed = 1;
    }

    const collected: string[] = [];
    const sentMessage = await channel.send(content);
    const collector: Discord.Collector<
        Discord.Snowflake,
        Discord.Message | Discord.MessageReaction
    > =
        collectionTrigger === 'react'
            ? sentMessage.createReactionCollector(
                  (reaction: Discord.MessageReaction, user: Discord.User) =>
                      reaction.emoji.name === '⛏️' && !user.bot,
                  {
                      time: 20 * 1000,
                  }
              )
            : channel.createMessageCollector(
                  (message: Discord.Message) =>
                      !message.author.bot &&
                      message.content.toLowerCase() ===
                          collectionTrigger.toLowerCase(),
                  {
                      time: 20 * 1000,
                  }
              );
    collector.on(
        'collect',
        async (
            collect: Discord.Message | Discord.MessageReaction,
            user: Discord.User
        ) => {
            let member: Discord.GuildMember | null;
            let message: Discord.Message;
            if (collect instanceof Discord.Message) {
                ({ member } = collect);
                message = collect;
            } else {
                member = guild.member(user.id);
                message = sentMessage;
            }
            if (
                !member ||
                collected.includes(member.id) ||
                collected.length >= maxCollectorAllowed
            )
                return;
            if (
                channel.messages.cache.filter(
                    msg =>
                        sentMessage.createdTimestamp - msg.createdTimestamp <
                        1000 * 60
                ).size < (collect instanceof Discord.Message ? 1 : 0)
            ) {
                if (collect instanceof Discord.Message) {
                    await channel.send(
                        `${member}, no sniping. You must be talking in ${channel} for the last 1 minute to pick the reward.`
                    );
                } else {
                    await collect.users.remove(member.id);
                }
                return;
            }
            collected.push(member.id);
            const balance = await getBalance(message, 'silence', member);
            if (balance === false) return;
            await database
                .ref(`discord_bot/community/currency/${member.id}/balance`)
                .set(balance + rngReward);
            if (rngReward < 1000) {
                await message.react('<:dicecoin:839981846419079178>');
            } else {
                await channel.send(
                    `${member} has collected the prize of <:dicecoin:839981846419079178> ${numberFormat.format(
                        rngReward
                    )}. Congratulations!`
                );
            }
            if (collected.length >= maxCollectorAllowed) {
                collector.stop();
            }
        }
    );
    if (collectionTrigger === 'react') {
        await sentMessage.react('⛏️');
    }
    collector.on('end', async () => {
        if (collected.length === 0) {
            await channel.send(
                `🙁 Looks like no one has claimed the reward of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )} this time.`
            );
        }

        const waitTime =
            process.env.NODE_ENV === 'production' ? 1000 * 60 * 30 : 10 * 1000; // only wait 10 seconds on dev
        const messageTimeout = new Map<string, boolean>();
        await Promise.race([
            wait(waitTime),
            channel.awaitMessages(
                (newMessage: Discord.Message) => {
                    if (
                        messageTimeout.get(newMessage.author.id) ||
                        newMessage.author.bot
                    )
                        return false;
                    messageTimeout.set(newMessage.author.id, true);
                    setTimeout(
                        () => messageTimeout.set(newMessage.author.id, false),
                        15 * 1000
                    );
                    return true;
                },
                {
                    max: 20,
                }
            ),
        ]);
        await pickCoins(client, database);
    });
}
