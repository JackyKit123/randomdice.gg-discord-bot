import Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import cache, { Dice } from '../util/cache';
import parsedText from '../util/parseText';
import cooldown from '../util/cooldown';

export default async function dice(message: Discord.Message): Promise<void> {
    const { channel, content } = message;
    if (
        await cooldown(message, '.gg dice', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const command = content.replace(/^\\?\.gg dice ?/i, '');
    if (!command || command.startsWith('-')) {
        await channel.send(
            'Please include the dice name in the first parameter after `.gg dice`.'
        );
        return;
    }
    const diceList = cache.dice;
    const die = diceList.find(
        d =>
            command.toLowerCase().replace(/-.*/, '').trim() ===
            d.name.toLowerCase()
    );
    const execute = async (target: Dice): Promise<void> => {
        let minClass: number;
        switch (target.rarity) {
            case 'Legendary':
                minClass = 7;
                break;
            case 'Unique':
                minClass = 5;
                break;
            case 'Rare':
                minClass = 3;
                break;
            default:
                minClass = 1;
        }

        const firstArgs = command.indexOf('-');
        if (firstArgs > -1) {
            const otherArgs = [
                ...command
                    .slice(firstArgs, command.length)
                    .replace(/(?:-l|--level|-c|--class)[=| +]\w+/gi, '')
                    .matchAll(/--?\w+(?:[=| +]\w+)?/gi),
            ];
            if (otherArgs.length) {
                await channel.send(
                    `Unknown arguments: ${otherArgs.map(
                        ([arg]) => `\`${arg}\``
                    )}. Acceptable arguments are \`--class\` \`--level\` or alias \`-c\` \`-l\``
                );
                return;
            }
        }

        const dieClassArgs = [
            ...command
                .slice(firstArgs, command.length)
                .matchAll(/(?:-c|--class)[=| +](\w+)/gi),
        ];
        const dieLevelArgs = [
            ...command
                .slice(firstArgs, command.length)
                .matchAll(/(?:-l|--level)[=| +](\w+)/gi),
        ];
        if (dieClassArgs.length > 1 || dieLevelArgs.length > 1) {
            if (dieClassArgs.length > 1) {
                await channel.send(
                    `Duplicated arguments for dice class: ${dieClassArgs
                        .map(arg => `\`${arg?.[0]}\``)
                        .join(' ')}`
                );
            }

            if (dieLevelArgs.length > 1) {
                await channel.send(
                    `Duplicated arguments for dice level: ${dieLevelArgs
                        .map(arg => `\`${arg?.[0]}\``)
                        .join(' ')}`
                );
            }
            return;
        }
        const dieClassArg = dieClassArgs[0]?.[1];
        const dieLevelArg = dieLevelArgs[0]?.[1];
        const dieClass = Number(dieClassArg || minClass);
        const dieLevel = Number(dieLevelArg || 1);

        if (
            Number.isNaN(dieClass) ||
            Number.isNaN(dieLevel) ||
            dieClass < minClass ||
            dieClass > 15 ||
            dieLevel < 1 ||
            dieLevel > 5
        ) {
            if (Number.isNaN(dieClass)) {
                await channel.send(
                    `Invalid arguments for dice class, \`${dieClassArg}\` is not a number.`
                );
            } else if (dieClass < minClass) {
                await channel.send(
                    `Invalid arguments for dice class, ${target.name} dice is in **${target.rarity} tier**, its minimum class is **${minClass}**.`
                );
            } else if (dieClass > 15) {
                await channel.send(
                    `Invalid arguments for dice class, the maximum dice class is **15**.`
                );
            }
            if (Number.isNaN(dieLevel)) {
                await channel.send(
                    `Invalid arguments for dice level, \`${dieLevelArg}\` is not a number.`
                );
            } else if (dieLevel < 1 || dieLevel > 5) {
                await channel.send(
                    `Invalid arguments for dice level, dice level should be between **1 - 5**.`
                );
            }
            return;
        }
        const atk =
            Math.round(
                (target.atk +
                    target.cupAtk * (dieClass - minClass) +
                    target.pupAtk * (dieLevel - 1)) *
                    100
            ) / 100;
        const spd =
            Math.round(
                (target.spd +
                    target.cupSpd * (dieClass - minClass) +
                    target.pupSpd * (dieLevel - 1)) *
                    100
            ) / 100;
        const eff1 =
            Math.round(
                (target.eff1 +
                    target.cupEff1 * (dieClass - minClass) +
                    target.pupEff1 * (dieLevel - 1)) *
                    100
            ) / 100;
        const eff2 =
            Math.round(
                (target.eff2 +
                    target.cupEff2 * (dieClass - minClass) +
                    target.pupEff2 * (dieLevel - 1)) *
                    100
            ) / 100;

        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(`${target.name} Dice`)
                    .setDescription(parsedText(target.detail))
                    .setThumbnail(target.img)
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/android-chrome-512x512.png',
                        'https://randomdice.gg/'
                    )
                    .setColor('#6ba4a5')
                    .setURL(`https://randomdice.gg/wiki/dice_mechanics`)
                    .addFields([
                        {
                            name: 'Attack Damage',
                            value: String(atk) || '-',
                            inline: true,
                        },
                        {
                            name: 'Type',
                            value: target.type,
                            inline: true,
                        },
                        {
                            name: 'Attack Speed',
                            value: spd ? `${spd}s` : '-',
                            inline: true,
                        },
                        {
                            name: 'Target',
                            value: target.target,
                            inline: true,
                        },
                        ...(!target.nameEff1 || target.nameEff1 === '-'
                            ? []
                            : [
                                  {
                                      name: target.nameEff1,
                                      value: eff1 + target.unitEff1,
                                      inline: true,
                                  },
                              ]),
                        ...(!target.nameEff2 || target.nameEff2 === '-'
                            ? []
                            : [
                                  {
                                      name: target.nameEff2,
                                      value: eff2 + target.unitEff2,
                                      inline: true,
                                  },
                              ]),
                    ])
                    .setFooter(
                        'randomdice.gg Dice Information',
                        'https://randomdice.gg/android-chrome-512x512.png'
                    ),
            ],
        });
    };

    if (die) {
        await execute(die);
        return;
    }

    const firstOptionalArgs = command.indexOf('-');
    const wrongDiceName =
        firstOptionalArgs > -1
            ? command.slice(0, firstOptionalArgs).trim()
            : command;
    const { bestMatch } = stringSimilarity.findBestMatch(
        wrongDiceName,
        diceList.map(d => d.name)
    );
    if (bestMatch.rating >= 0.3) {
        const sentMessage = await channel.send(
            `\`${wrongDiceName}\` is not a valid dice. Did you mean \`${bestMatch.target}\`? You may answer \`Yes\` to display the dice info.`
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
                    `\`${wrongDiceName}\` is not a valid dice. Did you mean \`${bestMatch.target}\`?`
                );
        }
        if (answeredYes) {
            const newDice = diceList.find(d => d.name === bestMatch.target);
            if (newDice) await execute(newDice);
        } else if (sentMessage.editable) {
            await sentMessage.edit(
                `\`${wrongDiceName}\` is not a valid dice. Did you mean \`${bestMatch.target}\`?`
            );
        }
    } else {
        await channel.send(`\`${wrongDiceName}\` is not a valid dice.`);
    }
}
