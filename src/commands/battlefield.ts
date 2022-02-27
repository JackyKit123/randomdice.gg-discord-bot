import Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import cache, { Battlefield } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';

export default async function dice(message: Discord.Message): Promise<void> {
    const { channel, content } = message;

    if (
        await cooldown(message, '.gg battlefield', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const command = content.replace(/^\\?\.gg battlefield ?/i, '');
    if (!command || command.startsWith('-')) {
        await channel.send(
            'Please include the battlefield name in the first parameter after `.gg battlefield`.'
        );
        return;
    }
    const battlefieldList = cache['wiki/battlefield'];
    const battlefield = battlefieldList.find(b =>
        command.toLowerCase().startsWith(b.name.toLowerCase())
    );

    const execute = async (target: Battlefield): Promise<void> => {
        const firstArgs = command.indexOf('-');
        if (firstArgs > -1) {
            const otherArgs = [
                ...command
                    .slice(firstArgs, command.length)
                    .replace(/(?:-l|--level)[=| +]\w+/gi, '')
                    .matchAll(/--?\w+(?:[=| +]\w+)?/gi),
            ];
            if (otherArgs.length) {
                await channel.send(
                    `Unknown arguments: ${otherArgs.map(
                        ([arg]) => `\`${arg}\``
                    )}. Acceptable arguments are \`--level\` or alias \`-l\``
                );
                return;
            }
        }

        const battlefieldLevelArgs = [
            ...command
                .slice(firstArgs, command.length)
                .matchAll(/(?:-l|--level)[=| +](\w+)/gi),
        ];

        if (battlefieldLevelArgs.length > 1) {
            await channel.send(
                `Duplicated arguments for battlefield level: ${battlefieldLevelArgs
                    .map(arg => `\`${arg?.[0]}\``)
                    .join(' ')}`
            );
            return;
        }

        const battlefieldLevelArg = battlefieldLevelArgs[0]?.[1];
        const battlefieldLevel = Number(battlefieldLevelArg || 0);

        if (Number.isNaN(battlefieldLevel)) {
            await channel.send(
                `Invalid arguments for battlefield level, \`${battlefieldLevelArg}\` is not a number.`
            );

            return;
        }
        if (battlefieldLevel < 0 || battlefieldLevel > 20) {
            await channel.send(
                `Invalid arguments for battlefield level, battlefield level should be between **0 - 20**.`
            );

            return;
        }

        const desc = parsedText(target.desc);

        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(target.name)
                    .setImage(target.img)
                    .setDescription(desc)
                    .addField(
                        target.buffName,
                        `${
                            Math.round(
                                (target.buffValue +
                                    target.buffCupValue * battlefieldLevel) *
                                    100
                            ) / 100
                        }${target.buffUnit}`
                    )
                    .addField('Obtained From', target.source)
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/android-chrome-512x512.png',
                        'https://randomdice.gg/'
                    )
                    .setColor('#6ba4a5')
                    .setURL(
                        `https://randomdice.gg/wiki/battlefield#${encodeURI(
                            target.name
                        )}`
                    )
                    .setFooter(
                        'randomdice.gg Battlefield Information',
                        'https://randomdice.gg/android-chrome-512x512.png'
                    ),
            ],
        });
    };

    if (battlefield) {
        await execute(battlefield);
        return;
    }

    const firstOptionalArgs = command.indexOf('-');
    const wrongBattlefieldName =
        firstOptionalArgs > -1
            ? command.slice(0, firstOptionalArgs).trim()
            : command;
    const { bestMatch } = stringSimilarity.findBestMatch(
        wrongBattlefieldName,
        battlefieldList.map(b => b.name)
    );
    if (bestMatch.rating >= 0.3) {
        const sentMessage = await channel.send(
            `\`${wrongBattlefieldName}\` is not a valid battlefield. Did you mean \`${bestMatch.target}\`? You may answer \`Yes\` to display the battlefield info.`
        );
        let answeredYes = false;
        try {
            const awaitedMessage = await channel.awaitMessages({
                filter: (newMessage: Discord.Message) =>
                    newMessage.author === message.author &&
                    !!newMessage.content.match(/^(y(es)?|no?|\\?\.gg ?)/i),
                time: 60000,
                max: 1,
                errors: ['time'],
            });
            if (awaitedMessage.first()?.content.match(/^y(es)?/i)) {
                answeredYes = true;
            }
        } catch {
            if (sentMessage.editable)
                await sentMessage.edit(
                    `\`${wrongBattlefieldName}\` is not a valid battlefield. Did you mean \`${bestMatch.target}\`?`
                );
        }
        if (answeredYes) {
            const newBattlefield = battlefieldList.find(
                b => b.name === bestMatch.target
            );
            if (newBattlefield) await execute(newBattlefield);
        } else if (sentMessage.editable) {
            await sentMessage.edit(
                `\`${wrongBattlefieldName}\` is not a valid battlefield. Did you mean \`${bestMatch.target}\`?`
            );
        }
    } else {
        await channel.send(
            `\`${wrongBattlefieldName}\` is not a valid battlefield.`
        );
    }
}
