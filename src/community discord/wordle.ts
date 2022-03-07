import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    CommandInteraction,
    GuildTextBasedChannel,
    Message,
    TextBasedChannel,
} from 'discord.js';
import { reply } from 'util/typesafeReply';
import wordList from './words.json';

const activeWordleGame = new Map<string, string>();
const guessRecord = new Map<string, { [authorId: string]: string[] }>();
const firstWinner = new Map<string, string>();

export const commandData = (enabledGuess = false): ApplicationCommandData => {
    const options: ApplicationCommandOptionData[] = [
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
            name: 'help',
            description: 'Show this help message',
            type: 1,
        },
    ];

    if (enabledGuess) {
        options.push({
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
        });
    }

    return {
        name: 'wordle',
        description: 'Wordle game',
        options,
    };
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
        if (word[i] === guess[i]) {
            result[i] = '🟩';
        } else if (word.includes(guess[i])) {
            result[i] = '🟨';
        }
    }
    return result;
};

const guessedWords = (word: string, guesses: string[]): string[] => {
    const checks: { [key: string]: string } = Object.fromEntries(
        'abcdefghijklmnopqrstuvwxyz'.split('').map(char => [char, '⬛'])
    );
    for (let i = guesses.length - 1; i >= 0; i -= 1) {
        for (let j = 0; j < guesses[i].length; j += 1) {
            if (word[j] === guesses[i][j]) {
                checks[guesses[i][j]] = '🟩';
            } else if (
                word.includes(guesses[i][j]) &&
                checks[guesses[i][j]] !== '🟩'
            ) {
                checks[guesses[i][j]] = '🟨';
            } else {
                checks[guesses[i][j]] = '🔳';
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
    )[0]?.length;
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

    await (channel as GuildTextBasedChannel).guild?.commands.cache
        .get('wordle')
        ?.edit(commandData(false));
}

async function guessWord(input: CommandInteraction): Promise<void> {
    const { guild, channel, member } = input;
    const author = input.client.users.cache.get(member?.user.id ?? '');
    if (!guild || !channel || !author) return;

    const guess = input.options.getString('word', true).toLowerCase();
    const word = activeWordleGame.get(channel.id);

    if (!word) {
        await reply(
            input,
            'There is not a wordle game going on in this channel, use `/wordle start` to start one.'
        );
        return;
    }

    if (!guess.match(/^[a-z]{5}$/i)) {
        await reply(input, 'Please enter a valid 5 letters word.', true);
        return;
    }

    if (!wordList.includes(guess)) {
        await reply(
            input,
            'Your guess is not in the word list. Please try again.',
            true
        );
        return;
    }

    const channelGuessRecord = guessRecord.get(channel.id) ?? {};
    const memberGuessRecord: string[] = channelGuessRecord[author.id] ?? [];

    if (memberGuessRecord.includes(word)) {
        await reply(
            input,
            'You have already won this game. Please wait for the next one.',
            true
        );
        return;
    }

    memberGuessRecord.push(guess);
    channelGuessRecord[author.id] = memberGuessRecord;
    guessRecord.set(channel.id, channelGuessRecord);

    const sendGuessRecord = () =>
        `${memberGuessRecord.length}/6\n\n${memberGuessRecord
            .map(record => `${verifyGuess(word, record).join('')}`)
            .join('\n')}`;

    if (memberGuessRecord[memberGuessRecord.length - 1] === word) {
        const isFirst = !firstWinner.get(channel.id);
        await reply(
            input,
            `You ${
                isFirst ? 'are the first to guess' : 'guesssed'
            } the word correctly!\n${memberGuessRecord
                .map(
                    record =>
                        `${emojiFy(record)}\n${verifyGuess(word, record).join(
                            ' '
                        )}`
                )
                .join('\n')}`,
            true
        );
        await channel.send(
            `${author} has guessed the word correctly! ${sendGuessRecord()}`
        );
        if (isFirst) {
            firstWinner.set(channel.id, author.id);
        }
    } else if (memberGuessRecord.length > 6) {
        await reply(input, `You have run out of guesses!`, true);
    } else {
        await reply(
            input,
            `Your guesses:\n${memberGuessRecord
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
            true
        );
        await channel.send(`${author} ${sendGuessRecord()}`);
        if (memberGuessRecord.length === 6) {
            await channel.send(
                `${author} has failed to guess the word correctly!`
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
    input: Message | CommandInteraction
): Promise<void> {
    const { guild, channel, member, client } = input;

    const author = client.users.cache.get(member?.user.id ?? '');

    if (!guild || !channel || !author) return;

    const isGuessing =
        input instanceof Message
            ? input.content.split(' ')[1] === 'guess'
            : input.options.getSubcommand() === 'guess';

    if (input instanceof CommandInteraction && isGuessing) {
        await guessWord(input);
        return;
    }

    if (
        input instanceof Message
            ? input.content.split(' ')[1] === 'help'
            : input.options.getSubcommand() === 'help'
    ) {
        await reply(
            input,
            'https://media.discordapp.net/attachments/804222694488932364/950204922895417414/HowtoplayoriginalWordle.png'
        );
        return;
    }

    if (activeWordleGame.get(channel.id)) {
        await reply(
            input,
            `There's a game already going on in this channel. Use \`/wordle guess\` to guess the word.`
        );
        return;
    }

    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];

    activeWordleGame.set(channel.id, randomWord);

    await reply(
        input,
        `${author} is starting a wordle game, use \`/wordle guess <word>\` to starting guessing`
    );

    await guild.commands.cache
        .find(({ name }) => name === 'wordle')
        ?.edit(commandData(true));

    const timeLimit =
        (input instanceof Message
            ? Number(input.content.split(' ')[2])
            : input.options.getInteger('time-limit')) ?? 5;

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
                    .map(([user]) => `<@${user}>`)
                    .join(' ')}\nThe game has ${timeLeft} minute${
                    timeLeft <= 1 ? '' : 's'
                } left!`
            );
        }
    }
    await endGame(channel, "Time's up!");
}
