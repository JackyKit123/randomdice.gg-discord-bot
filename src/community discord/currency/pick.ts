import Discord from 'discord.js';
import firebase from 'firebase-admin';
import { promisify } from 'util';
import getBalance from './balance';

let guild: Discord.Guild;
const wait = promisify(setTimeout);
export default async function pickCoins(
    client: Discord.Client,
    database: firebase.database.Database
): Promise<void> {
    if (!guild && process.env.NODE_ENV === 'production') {
        // skip waiting on dev
        await wait(1000 * 60 * 2.5); // initial wait time for boot up
    }
    guild =
        guild ||
        (await client.guilds.fetch(process.env.COMMUNITY_SERVER_ID || ''));
    const channel = guild.channels.cache.get(
        process.env.NODE_ENV === 'production'
            ? '804222694488932364' // #general
            : '804640084007321600' // #jackykit-playground
    );
    const numberFormat = new Intl.NumberFormat();

    if (!channel?.isText()) {
        return;
    }

    const rngMultiplier =
        10 **
        Math.ceil(
            Math.max(Math.min(5, -Math.log(Math.random()) / Math.log(2.6)), 1)
        );
    const rngReward = Math.ceil(Math.random() * rngMultiplier * 10);

    let content: string;
    let maxCollectorAllowed = 1;
    let collectionTrigger = '';
    const basicCollectionTriggers = [
        'GIMME',
        'COINS',
        'COIN',
        'PICK',
        'COLLECT',
        'ROB',
        'GRAB',
    ];
    const advancedCollectionTriggers = [
        'OMG Gimme all those money',
        'I need all those money',
        'PLZ COINS PLZ',
        'I am poor pls donate',
        'Gotta grab the coins this time',
        'Those are my money',
        'MONEY MONEY MONEY',
    ];
    const addInvisibleCharToString = (str: string): string =>
        str.replace(/\w/g, match => `‎${match}‎`);

    switch (rngMultiplier) {
        case 10:
            content = `A reward of <:dicecoin:839981846419079178> ${numberFormat.format(
                rngReward
            )} has shown up, type \`.\` to earn it.`;
            maxCollectorAllowed = Infinity;
            collectionTrigger = '.';
            break;
        case 100:
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
            break;
        case 1000:
            collectionTrigger =
                basicCollectionTriggers[
                    Math.floor(basicCollectionTriggers.length * Math.random())
                ];
            content = `💰💰💰💰 A big reward of <:dicecoin:839981846419079178> ${numberFormat.format(
                rngReward
            )} has shown up. The first one to type \`${addInvisibleCharToString(
                collectionTrigger
            )}\` can earn the reward. 💰💰💰💰`;
            break;
        case 10000:
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
            )}\` can earn the reward.`;
            break;
        default:
            return;
    }

    const collected: string[] = [];
    const collector = channel.createMessageCollector(
        (message: Discord.Message) =>
            !message.author.bot &&
            message.content.toLowerCase() === collectionTrigger.toLowerCase(),
        {
            time: 10 * 1000,
        }
    );
    collector.on('collect', async (message: Discord.Message) => {
        const { member } = message;
        if (!member || collected.includes(member.id)) return;
        collected.push(member.id);
        const balance = await getBalance(message, 'silence', member);
        if (balance === false) return;
        await database
            .ref(`discord_bot/community/currency/${member.id}/balance`)
            .set(balance + rngReward);
        if (rngMultiplier === 10 || rngMultiplier === 100) {
            await message.react('<:dicecoin:839981846419079178>');
        } else {
            await channel.send(
                `${member} has collected the prize of <:dicecoin:839981846419079178> ${numberFormat.format(
                    rngReward
                )}. Congratulations!`
            );
        }
        maxCollectorAllowed -= 1;
        if (maxCollectorAllowed <= 0) {
            collector.stop();
        }
    });
    await channel.send(content);
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
        await Promise.race([
            wait(waitTime),
            channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    !newMessage.author.bot &&
                    !channel.messages.cache.find(
                        oldMessage =>
                            oldMessage.author.id === newMessage.author.id &&
                            oldMessage.createdTimestamp -
                                newMessage.createdTimestamp <
                                1000 * 10
                    ),

                {
                    max: 30,
                }
            ),
        ]);
        await pickCoins(client, database);
    });
}
