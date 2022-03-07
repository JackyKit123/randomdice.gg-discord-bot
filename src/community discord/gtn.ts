import logMessage from 'dev-commands/logMessage';
import Discord, {
    ApplicationCommandData,
    CommandInteraction,
    DiscordAPIError,
    Message,
    MessageActionRow,
    MessageButton,
    User,
} from 'discord.js';
import { promisify } from 'util';
import { reply } from 'util/typesafeReply';

const wait = promisify(setTimeout);

const numberToGuess = new Map<string, number>();

export default async function gtn(
    input: Message | CommandInteraction
): Promise<void> {
    const { channel, member, client } = input;

    const author = client.users.cache.get(member?.user.id ?? '');

    if (!channel || !author) return;

    const maxRange =
        input instanceof Message
            ? Number(input.content.split(' ')[1])
            : input.options.getInteger('max-range', true);

    if (
        typeof numberToGuess.get(channel.id) !== 'undefined' &&
        numberToGuess.get(channel.id) !== -1
    ) {
        await reply(input, `There's a game already going on in this channel.`);
        return;
    }

    if (!maxRange || maxRange < 100 || maxRange > 1000000) {
        await reply(
            input,
            'Usage of the command: `!gtn <max Range (100 - 1m)>` Example```!gtn 1000```'
        );
        return;
    }

    numberToGuess.set(channel.id, 0);
    await reply(
        input,
        `${author}, please tell me in DM what number is in your mind, you have 20 seconds.`
    );
    const numberPrompt = await author.send('What is the number in your mind?');

    let awaitedMessage = await numberPrompt.channel.awaitMessages({
        filter: (newMessage: Discord.Message) =>
            Number.isInteger(Number(newMessage.content)),
        time: 20000,
        max: 1,
    });
    if (numberToGuess.get(channel.id) !== 0) {
        await author.send(
            'Someone else has started a game, please wait for the next round.'
        );
        return;
    }
    const numberInMind = Number(awaitedMessage.first()?.content);
    if (!Number.isInteger(numberInMind)) {
        numberToGuess.set(channel.id, -1);
        await author.send(
            'You have to tell me a number. Please redo the command.'
        );
        await channel.send(`${author} did not tell me a number in time.`);
        return;
    }
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

    const joinMessage = await channel.send({
        content: `${author} is starting a guess the number game for a number from \`1 - ${maxRange}\`, click below to join, starting in 10 seconds.`,
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel('Join Game')
                    .setCustomId('join-gtn')
                    .setStyle('SECONDARY'),
            ]),
        ],
    });

    const participants: User[] = [];

    joinMessage
        .createMessageComponentCollector({
            filter: async interaction => {
                if (interaction.customId !== 'join-gtn' || interaction.user.bot)
                    return false;
                return true;
            },
            time: 10000,
        })
        .on('collect', async interaction => {
            if (interaction.customId !== 'join-gtn' || interaction.user.bot)
                return;
            if (interaction.user.id === author.id) {
                await interaction.reply(`You can't join your own game.`);
                return;
            }
            if (participants.find(user => user.id === interaction.user.id)) {
                await interaction.reply(
                    `${interaction.user}, You have already joined.`
                );
                return;
            }
            participants.push(interaction.user);

            await interaction.reply(`${interaction.user} has joined the game!`);
        })
        .on('end', async () => {
            try {
                if (participants.length < 1) {
                    numberToGuess.set(channel.id, -1);
                    await joinMessage.edit({
                        content: 'Looks like no one is joining the game.',
                        components: [],
                    });
                    return;
                }

                await joinMessage.edit({
                    content: `${author}'s game is starting!`,
                    components: [],
                });

                let i = 0;
                let afks = 0;
                let smallGuess = 1;
                let bigGuess = maxRange;
                while (numberToGuess.get(channel.id) || 0 > -1) {
                    if (i === participants.length) {
                        i = 0;
                        afks = 0;
                    }
                    const currentParticipant = participants[i];
                    /* eslint-disable no-await-in-loop */
                    await channel.send(
                        `${currentParticipant}, guess the number! Current: \`${smallGuess} - ${bigGuess}\``
                    );

                    awaitedMessage = await channel.awaitMessages({
                        filter: (newMessage: Discord.Message) =>
                            Number.isInteger(Number(newMessage.content)) &&
                            newMessage.author.id === currentParticipant.id,
                        time: 20000,
                        max: 1,
                    });
                    const guess = Number(awaitedMessage.first()?.content);
                    if (!Number.isInteger(guess)) {
                        afks += 1;
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
                    } else if (guess < smallGuess || guess > bigGuess) {
                        await channel.send(
                            `**${guess}** is out of range. You failed this round.`
                        );
                    } else if (
                        guess > (numberToGuess.get(channel.id) as number)
                    ) {
                        bigGuess = guess - 1;
                        await channel.send(
                            `**${guess}** is not the number, go smaller!`
                        );
                    } else if (
                        guess < (numberToGuess.get(channel.id) as number)
                    ) {
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
                }
            } catch (err) {
                await logMessage(
                    client,
                    'warning',
                    `Oops! something went wrong in guess the number!\n${
                        (err as DiscordAPIError).stack ??
                        (err as Error).message ??
                        err
                    }`
                );
            }
        });
}

export const commandData: ApplicationCommandData = {
    name: 'gtn',
    description: 'Start a guess the number game.',
    options: [
        {
            name: 'max-range',
            description: 'The maximum range of the number to guess.',
            type: 4,
            minValue: 100,
            maxValue: 1000000,
            required: true,
        },
    ],
};
