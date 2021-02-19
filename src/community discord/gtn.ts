import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

const numberToGuess = new Map<string, number>();

export default async function gtn(message: Discord.Message): Promise<void> {
    const { content, author, channel } = message;

    const maxRange = Number(content.split(' ')[1]);

    if (
        typeof numberToGuess.get(channel.id) !== 'undefined' &&
        numberToGuess.get(channel.id) !== -1
    ) {
        await channel.send(`There's a game already going on in this channel.`);
        return;
    }

    if (!maxRange || maxRange < 100) {
        await channel.send(
            'Usage of the command: `!gtn <max Range (100 minimum)>` Example```!gtn 1000```'
        );
        return;
    }

    numberToGuess.set(channel.id, 0);
    await channel.send(
        `${author}, please tell me in DM what number is in your mind, you have 20 seconds.`
    );
    const numberPrompt = await author.send('What is the number in your mind?');
    try {
        const awaitedMessage = await numberPrompt.channel.awaitMessages(
            (newMessage: Discord.Message) =>
                Number.isInteger(Number(newMessage.content)),
            { time: 20000, max: 1, errors: ['time'] }
        );
        if (numberToGuess.get(channel.id) !== 0) {
            await author.send(
                'Someone else has started a game, please wait for the next round.'
            );
            return;
        }
        const numberInMind = Number(awaitedMessage.first()?.content);
        if (numberInMind > maxRange) {
            numberToGuess.set(channel.id, -1);
            await author.send(
                `**${numberInMind}** is larger than the max range ${maxRange} you specified.`
            );
            return;
        }
        if (numberInMind < 1) {
            numberToGuess.set(channel.id, -1);
            await author.send('The number cannot be smaller than 1.');
            return;
        }
        numberToGuess.set(channel.id, numberInMind);
        await numberPrompt.channel.send(
            `Alright, ${numberToGuess.get(channel.id)} will be the number!`
        );
    } catch {
        numberToGuess.set(channel.id, -1);
        await channel.send(`${author} did not tell me a number in time.`);
        return;
    }
    const joinMessage = await channel.send(
        `${author} is starting a guess the number game for a number from \`1 - ${maxRange}\`, react ✅ to join, starting in 10 seconds.`
    );
    await joinMessage.react('✅');

    const reactions = await joinMessage.awaitReactions(
        (reaction: Discord.MessageReaction, user: Discord.User) =>
            reaction.emoji.name === '✅' && user.id !== author.id && !user.bot,
        { time: 10000 }
    );
    const participants = reactions
        .find(reaction => reaction.emoji.name === '✅')
        ?.users.cache.filter(user => user.id !== author.id && !user.bot)
        .array();
    await message.reactions.removeAll();

    if (!participants?.length) {
        numberToGuess.set(channel.id, -1);
        await channel.send('Looks like no one is joining the game.');
        return;
    }

    let i = 0;
    let afks = 0;
    let smallGuess = 1;
    let bigGuess = maxRange;
    while (numberToGuess.get(channel.id) || 0 > -1) {
        if (i === participants.length) {
            i = 0;
        }
        const currentParticipant = participants[i];
        /* eslint-disable no-await-in-loop */
        await channel.send(
            `${currentParticipant}, guess the number! Current: \`${smallGuess} - ${bigGuess}\``
        );
        try {
            /* eslint-disable no-loop-func */
            const awaitedMessage = await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    Number.isInteger(Number(newMessage.content)) &&
                    newMessage.author.id === currentParticipant.id,
                { time: 20000, max: 1, errors: ['time'] }
            );
            afks = 0;
            const guess = Number(awaitedMessage.first()?.content);
            if (guess < smallGuess || guess > bigGuess) {
                await channel.send(
                    `**${guess}** is out of range. You failed this round.`
                );
            } else if (guess > (numberToGuess.get(channel.id) as number)) {
                bigGuess = guess - 1;
                await channel.send(
                    `**${guess}** is not the number, go smaller!`
                );
            } else if (guess < (numberToGuess.get(channel.id) as number)) {
                smallGuess = guess + 1;
                await channel.send(
                    `**${guess}** is not the number, go bigger!`
                );
            } else {
                await channel.send(
                    `**${guess}** is the number from ${author}, congratulations to ${currentParticipant}!`
                );
                numberToGuess.set(channel.id, -1);
                return;
            }
            i += 1;
            await wait(2000);
        } catch {
            afks += 1;
            i += 1;
            await channel.send(
                `${currentParticipant} did not tell me a number in time.`
            );
            if (afks === participants.length) {
                numberToGuess.set(channel.id, -1);
                await channel.send(
                    `All participants did not tell me a number in time, terminating this game.`
                );
                return;
            }
        }
    }
}
