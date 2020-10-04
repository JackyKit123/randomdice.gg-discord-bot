import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import cache, { Dice } from '../helper/cache';
import parsedText from '../helper/parseText';

export default async function dice(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const args = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg dice ?/, '')
        .split(' ');
    if (!args[0] || args[0].startsWith('-')) {
        await channel.send(
            'Please include the dice name in the first parameter after `.gg dice`.'
        );
        return;
    }
    const diceList = (await cache(database, 'dice')) as Dice[];
    const die = diceList.find(d =>
        args.join(' ').toLowerCase().startsWith(d.name.toLowerCase())
    );
    if (!die) {
        const firstOptionalArgs = args.findIndex(arg => arg.startsWith('-'));
        if (firstOptionalArgs >= 0) {
            args.splice(firstOptionalArgs, args.length);
        }
        const wrongDiceName = args.join(' ');
        const { bestMatch } = stringSimilarity.findBestMatch(
            wrongDiceName,
            diceList.map(d => d.name)
        );
        await channel.send(
            `\`${wrongDiceName}\` is not a valid dice.${
                bestMatch.rating >= 0.5
                    ? ` Did you mean \`${bestMatch.target}\`?`
                    : ''
            }`
        );
        return;
    }

    let minClass: number;
    switch (die.rarity) {
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

    const firstArgs = args.findIndex(arg => arg.startsWith('-'));
    if (firstArgs > -1) {
        const otherArgs = args.filter(
            (arg, i) =>
                i >= firstArgs && !/^(-l|--level|-c|--class)=(.+)/.test(arg)
        );
        if (otherArgs.length) {
            await channel.send(
                `Unknown arguments: ${otherArgs.map(
                    arg => `\`${arg}\``
                )}. Acceptable arguments are \`--class=?\` \`--level\` or alias \`-c=?\` \`-l=?\``
            );
            return;
        }
    }

    const dieClassArgs = args
        .map(arg => arg.match(/^(-c|--class)=(.+)/))
        .filter(arg => arg);
    const dieLevelArgs = args
        .map(arg => arg.match(/^(-l|--level)=(.+)/))
        .filter(arg => arg);
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
    const dieClassArg = dieClassArgs[0]?.[2];
    const dieLevelArg = dieLevelArgs[0]?.[2];
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
                `Invalid arguments for dice class, ${die.name} dice is in **${die.rarity} tier**, its minimum class is **${minClass}**.`
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
        Math.floor(
            (die.atk +
                die.cupAtk * (dieClass - minClass) +
                die.pupAtk * (dieLevel - 1)) *
                100
        ) / 100;
    const spd =
        Math.floor(
            (die.spd +
                die.cupSpd * (dieClass - minClass) +
                die.pupSpd * (dieLevel - 1)) *
                100
        ) / 100;
    const eff1 =
        Math.floor(
            (die.eff1 +
                die.cupEff1 * (dieClass - minClass) +
                die.pupEff1 * (dieLevel - 1)) *
                100
        ) / 100;
    const eff2 =
        Math.floor(
            (die.eff2 +
                die.cupEff2 * (dieClass - minClass) +
                die.pupEff2 * (dieLevel - 1)) *
                100
        ) / 100;

    await channel.send(
        new Discord.MessageEmbed()
            .setTitle(`${die.name} Dice`)
            .setDescription(parsedText(die.detail))
            .setThumbnail(die.img)
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/title_dice.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setURL(`https://randomdice.gg/wiki/dice_mechanics`)
            .addFields([
                {
                    name: 'Attack Damage',
                    value: atk || '-',
                    inline: true,
                },
                {
                    name: 'Type',
                    value: die.type,
                    inline: true,
                },
                {
                    name: 'Attack Speed',
                    value: spd ? `${spd}s` : '-',
                    inline: true,
                },
                {
                    name: 'Target',
                    value: die.target,
                    inline: true,
                },
                ...(!die.nameEff1 || die.nameEff1 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff1,
                              value: eff1 + die.unitEff1,
                              inline: true,
                          },
                      ]),
                ...(!die.nameEff2 || die.nameEff2 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff2,
                              value: eff2 + die.unitEff2,
                              inline: true,
                          },
                      ]),
            ])
            .setFooter(
                'randomdice.gg Dice Information',
                'https://randomdice.gg/title_dice.png'
            )
    );
}
