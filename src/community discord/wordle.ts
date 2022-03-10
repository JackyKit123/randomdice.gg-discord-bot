import {
    ApplicationCommandData,
    CommandInteraction,
    TextBasedChannel,
} from 'discord.js';
import wordList from './words.json';

const activeWordleGame = new Map<string, string>();
const guessRecord = new Map<string, { [authorId: string]: string[] }>();
const firstWinner = new Map<string, string>();

export const commandData: ApplicationCommandData = {
    name: 'wordle',
    description: 'Wordle game',
    options: [
        {
            name: 'start',
            description: 'Start a wordle game',
            type: 1,
            options: [
                {
                    name: 'time-limit',
                    description:
                        'The time limit in minutes for the game (default: 5mins)',
                    type: 4,
                    minValue: 3,
                    maxValue: 10,
                },
            ],
        },
        {
            name: 'guess',
            description: 'Guess a word',
            type: 1,
            options: [
                {
                    name: 'word',
                    description: 'The word to guess',
                    type: 3,
                    required: true,
                },
            ],
        },
        {
            name: 'help',
            description: 'Show this help message',
            type: 1,
        },
    ],
};

const emojiFy = (word: string): string =>
    word
        .split('')
        .map(char => `:regional_indicator_${char}:`)
        .join(' ');

const verifyGuess = (word: string, guess: string): string[] => {
    const result: [string, string, string, string, string] = [
        '🔳',
        '🔳',
        '🔳',
        '🔳',
        '🔳',
    ];
    for (let i = 0; i < word.length; i += 1) {
        const char = guess[i];
        if (word[i] === char) {
            result[i] = '🟩';
        } else if (word.includes(char)) {
            result[i] = word
                .split('')
                .filter((letter, j) => letter !== guess[j])
                .includes(char)
                ? '🟨'
                : '🔳';
        }
    }
    return result;
};

const guessedWords = (word: string, guesses: string[]): string[] => {
    const checks: { [key: string]: string } = Object.fromEntries(
        'abcdefghijklmnopqrstuvwxyz'.split('').map(char => [char, '⬛'])
    );
    for (let i = guesses.length - 1; i >= 0; i -= 1) {
        const guess = guesses[i];
        for (let j = 0; j < guess.length; j += 1) {
            const char = guess[j];
            if (word[j] === char) {
                checks[char] = '🟩';
            } else if (word.includes(char) && checks[char] !== '🟩') {
                checks[char] = '🟨';
            } else if (checks[char] === '⬛') {
                checks[char] = '🔳';
            }
        }
    }
    return Object.values(checks);
};

async function endGame(
    channel: TextBasedChannel,
    message: string
): Promise<void> {
    const word = activeWordleGame.get(channel.id) ?? '';
    const channelGuessRecord = guessRecord.get(channel.id) ?? {};
    const flatten = Object.entries(channelGuessRecord);

    const leastGuesses = flatten.sort(
        ([, recordA], [, recordB]) => recordA.length - recordB.length
    )[0]?.[1]?.length;
    const leastGuessesWinners = flatten
        .filter(([, record]) => record.length === leastGuesses)
        .map(([authorId]) => `<@${authorId}>`);
    const failGuessers = flatten
        .filter(([, record]) => record.every(guess => guess !== word))
        .map(([authorId]) => `<@${authorId}>`);

    await channel.send(
        `The game has ended.${message} \nThe word was ${emojiFy(
            activeWordleGame.get(channel.id) ?? ''
        )}${
            firstWinner.get(channel.id) && flatten.length > 1
                ? `\nThe first person to guess correctly was <@${
                      firstWinner.get(channel.id) ?? ''
                  }>`
                : ''
        }${
            leastGuessesWinners.length > 1
                ? `\nThe least number of guesses was ${
                      leastGuessesWinners.length
                  } guess${
                      leastGuessesWinners.length > 1 ? 'es' : ''
                  } by ${leastGuessesWinners.join(', ')}`
                : ''
        }${
            failGuessers.length
                ? `\n${failGuessers.join(
                      ' '
                  )} failed to guess the word correctly, what a loser!`
                : ''
        }`
    );
    activeWordleGame.delete(channel.id);
    guessRecord.delete(channel.id);
    firstWinner.delete(channel.id);
}

async function guessWord(interaction: CommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, user } = interaction;

    if (!channel) return;
    const guess = interaction.options.getString('word', true).toLowerCase();
    const word = activeWordleGame.get(channel.id);

    if (!word) {
        await interaction.reply(
            'There is not a wordle game going on in this channel, use `/wordle start` to start one.'
        );
        return;
    }

    if (!guess.match(/^[a-z]{5}$/i)) {
        await interaction.reply({
            content: 'Please enter a valid 5 letters word.',
            ephemeral: true,
        });
        return;
    }

    if (!wordList.includes(guess)) {
        await interaction.reply({
            content: 'Your guess is not in the word list. Please try again.',
            ephemeral: true,
        });
        return;
    }

    const channelGuessRecord = guessRecord.get(channel.id) ?? {};
    const memberGuessRecord: string[] = channelGuessRecord[user.id] ?? [];

    if (memberGuessRecord.includes(word)) {
        await interaction.reply({
            content:
                'You have already won this game. Please wait for the next one.',
            ephemeral: true,
        });
        return;
    }

    memberGuessRecord.push(guess);
    channelGuessRecord[user.id] = memberGuessRecord;
    guessRecord.set(channel.id, channelGuessRecord);

    const sendGuessRecord = () =>
        `${memberGuessRecord.length}/6\n\n${memberGuessRecord
            .map(record => `${verifyGuess(word, record).join('')}`)
            .join('\n')}`;

    if (memberGuessRecord[memberGuessRecord.length - 1] === word) {
        const isFirst = !firstWinner.get(channel.id);
        await interaction.reply({
            content: `You ${
                isFirst ? 'are the first to guess' : 'guesssed'
            } the word correctly!\n${memberGuessRecord
                .map(
                    record =>
                        `${emojiFy(record)}\n${verifyGuess(word, record).join(
                            ' '
                        )}`
                )
                .join('\n')}`,
            ephemeral: true,
        });
        await channel.send(
            `${user} has guessed the word correctly! ${sendGuessRecord()}`
        );
        if (isFirst) {
            firstWinner.set(channel.id, user.id);
        }
    } else if (memberGuessRecord.length > 6) {
        await interaction.reply({
            content: `You have run out of guesses!`,
            ephemeral: true,
        });
    } else {
        await interaction.reply({
            content: `Your guesses:\n${memberGuessRecord
                .map(
                    record =>
                        `${emojiFy(record)}\n${verifyGuess(word, record).join(
                            ' '
                        )}`
                )
                .join('\n')}\n\nYour guessed letters:\n${[
                'abcdefghijklm',
                'nopqrstuvwxyz',
            ]
                .map(
                    (chars, i) =>
                        `${chars
                            .split('')
                            .map(emojiFy)
                            .join(' ')}\n${guessedWords(word, memberGuessRecord)
                            .slice(i * 13, i * 13 + 13)
                            .join(' ')}`
                )
                .join('\n')}`,
            ephemeral: true,
        });
        await channel.send(`${user} ${sendGuessRecord()}`);
        if (memberGuessRecord.length === 6) {
            await channel.send(
                `${user} has failed to guess the word correctly!`
            );
        }
    }

    if (
        Object.values(channelGuessRecord).every(
            record => record[record.length - 1] === word || record.length === 6
        )
    ) {
        await endGame(
            channel,
            Object.values(channelGuessRecord).every(
                record => record[record.length - 1] === word
            )
                ? 'Everyone has guessed the word correctly!'
                : ''
        );
    }
}

export default async function wordle(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { channel, client, user, options } = interaction;
    if (!channel) return;

    if (options.getSubcommand() === 'guess') {
        await guessWord(interaction);
        return;
    }

    if (options.getSubcommand() === 'help') {
        await interaction.reply(
            'https://media.discordapp.net/attachments/804222694488932364/950204922895417414/HowtoplayoriginalWordle.png'
        );
        return;
    }

    if (activeWordleGame.get(channel.id)) {
        await interaction.reply(
            `There's a game already going on in this channel. Use \`/wordle guess\` to guess the word.`
        );
        return;
    }

    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];

    activeWordleGame.set(channel.id, randomWord);

    await interaction.reply(
        `${user} is starting a wordle game, use \`/wordle guess <word>\` to starting guessing`
    );

    const timeLimit = interaction.options.getInteger('time-limit') ?? 5;

    for (let timeLeft = timeLimit - 1; timeLeft > 0; timeLeft -= 1) {
        /* eslint-disable no-await-in-loop */
        const awaited = await channel.awaitMessages({
            filter: msg =>
                msg.author.id === client.user?.id &&
                msg.content.startsWith('The game has ended'),
            time: 60 * 1000,
        });
        if (awaited.size > 0) return;

        if (timeLeft !== 0) {
            await channel.send(
                `${Object.entries(guessRecord.get(channel.id) ?? {})
                    .filter(
                        ([, record]) =>
                            record.length < 6 && !record.includes(randomWord)
                    )
                    .map(([uid]) => `<@${uid}>`)
                    .join(' ')}\nThe game has ${timeLeft} minute${
                    timeLeft <= 1 ? '' : 's'
                } left!`
            );
        }
    }
    await endGame(channel, "Time's up!");
}
