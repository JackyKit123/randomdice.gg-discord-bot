import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as stringSimilarity from 'string-similarity';
import cache, { Battlefield } from '../helper/cache';
import parsedText from '../helper/parseText';

export default async function dice(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const args = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?\.gg battlefield ?/i, '')
        .split(' ');
    if (!args[0] || args[0].startsWith('-')) {
        await channel.send(
            'Please include the battlefield name in the first parameter after `.gg battlefield`.'
        );
        return;
    }
    const battlefieldList = (await cache(
        database,
        'wiki/battlefield'
    )) as Battlefield[];
    const battlefield = battlefieldList.find(b =>
        args.join(' ').toLowerCase().startsWith(b.name.toLowerCase())
    );

    const execute = async (target: Battlefield): Promise<void> => {
        const firstArgs = args.findIndex(arg => arg.startsWith('-'));
        if (firstArgs > -1) {
            const otherArgs = args.filter(
                (arg, i) => i >= firstArgs && !/^(-l|--level)=(.+)/i.test(arg)
            );
            if (otherArgs.length) {
                await channel.send(
                    `Unknown arguments: ${otherArgs.map(
                        arg => `\`${arg}\``
                    )}. Acceptable arguments are \`--level\` or alias \`-l=?\``
                );
                return;
            }
        }

        const battlefieldLevelArgs = args
            .map(arg => arg.match(/^(-l|--level)=(.+)/))
            .filter(arg => arg);

        if (battlefieldLevelArgs.length > 1) {
            await channel.send(
                `Duplicated arguments for battlefield level: ${battlefieldLevelArgs
                    .map(arg => `\`${arg?.[0]}\``)
                    .join(' ')}`
            );
            return;
        }

        const battlefieldLevelArg = battlefieldLevelArgs[0]?.[2];
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

        await channel.send(
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
                )
        );
    };

    if (battlefield) {
        await execute(battlefield);
        return;
    }

    const firstOptionalArgs = args.findIndex(arg => arg.startsWith('-'));
    const wrongBattlefieldName = args
        .filter((_, i) => firstOptionalArgs === -1 || i < firstOptionalArgs)
        .join(' ');
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
            const awaitedMessage = await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    newMessage.author === message.author &&
                    !!newMessage.content
                        .replace(/[^\040-\176\200-\377]/gi, '')
                        .match(/^(y(es)?|no?|\\?\.gg ?)/i),
                { time: 60000, max: 1, errors: ['time'] }
            );
            if (
                awaitedMessage
                    .first()
                    ?.content.replace(/[^\040-\176\200-\377]/gi, '')
                    .match(/^y(es)?/i)
            ) {
                answeredYes = true;
            }
        } catch {
            await sentMessage.edit(
                `\`${wrongBattlefieldName}\` is not a valid battlefield. Did you mean \`${bestMatch.target}\`?`
            );
        }
        if (answeredYes) {
            await execute(
                battlefieldList.find(
                    b => b.name === bestMatch.target
                ) as Battlefield
            );
        } else {
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
