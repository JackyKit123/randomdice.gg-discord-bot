import {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    Message,
    MessageEmbed,
    ReplyMessageOptions,
} from 'discord.js';
import cache, { Battlefield } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import bestMatchFollowUp from 'util/bestMatchFollowUp';
import { getAscendingNumberArray, mapChoices } from 'register/slashCommands';

export default async function dice(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg battlefield', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const command =
        input instanceof Message
            ? input.content.replace(/^\.gg battlefield ?/i, '')
            : input.options.getString('battlefield') ?? '';

    const battlefieldList = cache['wiki/battlefield'];
    const battlefieldName = command.toLowerCase();
    if (!battlefieldName) {
        await reply(input, 'Please specify a battlefield name.');
        return;
    }
    const battlefield = battlefieldList.find(b =>
        battlefieldName.startsWith(b.name.toLowerCase())
    );

    const getBattlefieldInfo = (
        target?: Battlefield
    ): string | ReplyMessageOptions => {
        const firstArgs = command.indexOf('-');
        if (!target) return 'No battlefield found.';
        if (firstArgs > -1) {
            const otherArgs = [
                ...command
                    .slice(firstArgs, command.length)
                    .replace(/(?:-l|--level)[=| +]\w+/gi, '')
                    .matchAll(/--?\w+(?:[=| +]\w+)?/gi),
            ];
            if (otherArgs.length) {
                return `Unknown arguments: ${otherArgs.map(
                    ([arg]) => `\`${arg}\``
                )}. Acceptable arguments are \`--level\` or alias \`-l\``;
            }
        }

        const battlefieldLevelArgs = [
            ...command
                .slice(firstArgs, command.length)
                .matchAll(/(?:-l|--level)[=| +](\w+)/gi),
        ];

        if (battlefieldLevelArgs.length > 1) {
            return `Duplicated arguments for battlefield level: ${battlefieldLevelArgs
                .map(arg => `\`${arg?.[0]}\``)
                .join(' ')}`;
        }

        const battlefieldLevelArg =
            input instanceof CommandInteraction
                ? input.options.getInteger('level')
                : battlefieldLevelArgs[0]?.[1];
        const battlefieldLevel = Number(battlefieldLevelArg || 0);

        if (Number.isNaN(battlefieldLevel)) {
            return `Invalid arguments for battlefield level, \`${battlefieldLevelArg}\` is not a number.`;
        }
        if (battlefieldLevel < 0 || battlefieldLevel > 20) {
            return `Invalid arguments for battlefield level, battlefield level should be between **0 - 20**.`;
        }

        const desc = parsedText(target.desc);

        return {
            embeds: [
                new MessageEmbed()
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
        };
    };

    if (battlefield) {
        await reply(input, getBattlefieldInfo(battlefield));
        return;
    }

    const firstOptionalArgs = command.indexOf('-');
    const wrongBattlefieldName =
        firstOptionalArgs > -1
            ? command.slice(0, firstOptionalArgs).trim()
            : command;
    await bestMatchFollowUp(
        input,
        wrongBattlefieldName,
        battlefieldList,
        ' is not a valid battlefield.',
        getBattlefieldInfo
    );
}

export const commandData = (
    battlefield: Battlefield[]
): ApplicationCommandDataResolvable => ({
    name: 'battlefield',
    description: 'get the information about a battlefield',
    options: [
        {
            type: 3,
            name: 'battlefield',
            description: 'the name of the battlefield',
            required: true,
            choices: mapChoices(battlefield),
        },
        {
            type: 4,
            name: 'level',
            description: 'the level of the battlefield',
            minValue: 1,
            maxValue: 20,
            choices: getAscendingNumberArray(20, 'Level'),
        },
    ],
});
