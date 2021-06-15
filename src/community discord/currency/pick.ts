import Discord from 'discord.js';
import firebase from 'firebase-admin';
import { promisify } from 'util';
import getBalance from './balance';

const wait = promisify(setTimeout);
const numberFormat = new Intl.NumberFormat();
const activeCoinbombInChannel = new Map<string, boolean>();
let database: firebase.database.Database;

export default async function pickCoins(
    channel: Discord.TextChannel | Discord.NewsChannel,
    recursive = false
): Promise<void> {
    activeCoinbombInChannel.set(channel.id, true);
    const { guild } = channel;
    const rngMultiplier =
        10 **
        Math.ceil(
            Math.max(Math.min(4, -Math.log(Math.random()) / Math.log(2.6)), 1)
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
        content = `A tiny batch of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up, react to \`⛏️\` to pick it`;
        maxCollectorAllowed = Infinity;
        collectionTrigger = 'reaction';
    } else if (rngReward < 1000) {
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        content = `💵💵 A batch of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up, the first 5 people to type \`${addInvisibleCharToString(
            collectionTrigger
        )}\` can earn the coins. 💵💵`;
        maxCollectorAllowed = 5;
    } else if (rngReward < 10000) {
        collectionTrigger =
            basicCollectionTriggers[
                Math.floor(basicCollectionTriggers.length * Math.random())
            ];
        content = `💰💰💰💰 A huge batch of <:dicecoin:839981846419079178> ${numberFormat.format(
            rngReward
        )} has shown up. The first one to type \`${addInvisibleCharToString(
            collectionTrigger
        )}\` can earn the coins. 💰💰💰💰`;
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
        )}\` can earn the coins.`;
        maxCollectorAllowed = 1;
    }

    const collected: string[] = [];
    const sentMessage = await channel.send(content);
    const collector: Discord.Collector<
        Discord.Snowflake,
        Discord.Message | Discord.MessageReaction
    > =
        collectionTrigger === 'reaction'
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
                !channel.messages.cache.filter(
                    msg =>
                        msg.author.id === member?.id &&
                        sentMessage.createdTimestamp - msg.createdTimestamp <
                            1000 * 60 &&
                        msg.createdTimestamp < sentMessage.createdTimestamp
                ).size
            ) {
                if (collect instanceof Discord.Message) {
                    await channel.send(
                        `${member}, no sniping. You must be talking in ${channel} for the last 1 minute to earn the reward.`
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
            if (rngReward < 1000 && rngReward >= 100) {
                await message.react('<:dicecoin:839981846419079178>');
            } else if (rngReward > 1000) {
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
    if (collector instanceof Discord.ReactionCollector) {
        await sentMessage.react('⛏️');
    }
    collector.on('end', async () => {
        activeCoinbombInChannel.set(channel.id, false);
        if (collected.length === 0) {
            await channel.send(
                `🙁 Looks like no one has claimed the batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )} this time.`
            );
        } else if (collector instanceof Discord.ReactionCollector) {
            try {
                await sentMessage.edit(
                    `${collected.map(id => `<@${id}>`).join(' ')} ${
                        collected.length > 1 ? 'have' : 'has'
                    } \`⛏️\` up the tiny batch of <:dicecoin:839981846419079178> ${numberFormat.format(
                        rngReward
                    )}.`
                );
            } catch {
                // nothing
            }
        }

        if (!recursive) return;
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
        pickCoins(channel, true);
    });
}

export async function pickCoinsInit(
    client: Discord.Client,
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

    if (!channel?.isText()) {
        return;
    }
    if (process.env.NODE_ENV === 'production') {
        await wait(
            (await channel.messages.fetch({ limit: 50 })).filter(
                msg => Date.now() - msg.createdTimestamp > 1000 * 60 * 5
            ).size *
                1000 *
                3
        );
    }
    pickCoins(channel, true);
}

export async function spawnCoinbomb(message: Discord.Message): Promise<void> {
    const { member, channel } = message;
    if (
        !member ||
        !(
            member.hasPermission('ADMINISTRATOR') ||
            member.roles.cache.has('805000661133295616') ||
            member.roles.cache.has('805772165394858015')
        ) ||
        channel instanceof Discord.DMChannel
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
    pickCoins(channel);
}
