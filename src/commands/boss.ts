import Discord, {
    ApplicationCommandDataResolvable,
    CommandInteraction,
    Message,
    ReplyMessageOptions,
} from 'discord.js';
import cache, { Boss } from 'util/cache';
import parsedText from 'util/parseText';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';
import bestMatchFollowUp from 'util/bestMatchFollowUp';

export default async function boss(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg boss', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    const bossName =
        input instanceof Message
            ? input.content.replace(/^\\?\.gg boss ?/, '')
            : input.options.getString('boss') ?? '';
    if (!bossName) {
        await reply(
            input,
            'Please include the boss name in command parameter.'
        );
        return;
    }
    const bossList = cache['wiki/boss'];
    const bossInfo = bossList.find(
        b => b.name.toLowerCase() === bossName.toLowerCase()
    );

    const getBossInfo = (target?: Boss): string | ReplyMessageOptions => {
        if (!target) return 'No boss found.';
        const embedFields = parsedText(target.desc)
            .split('\n')
            .filter(p => p !== '')
            .map((desc, i) => ({
                name: i === 0 ? 'Boss Mechanic' : '‎',
                value: desc,
            }));

        return {
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(target.name)
                    .setThumbnail(target.img)
                    .setAuthor(
                        'Random Dice Community Website',
                        'https://randomdice.gg/android-chrome-512x512.png',
                        'https://randomdice.gg/'
                    )
                    .setColor('#6ba4a5')
                    .setURL(
                        `https://randomdice.gg/wiki/boss_mechanics#${encodeURI(
                            target.name
                        )}`
                    )
                    .addFields(embedFields)
                    .setFooter(
                        'randomdice.gg Boos Information',
                        'https://randomdice.gg/android-chrome-512x512.png'
                    ),
            ],
        };
    };

    if (bossInfo) {
        await reply(input, getBossInfo(bossInfo));
        return;
    }

    await bestMatchFollowUp(
        input,
        bossName,
        bossList,
        ' is not a valid boss.',
        getBossInfo
    );
}

export const commandData: ApplicationCommandDataResolvable = {
    name: 'boss',
    description: 'get the information about a boss',
    options: [
        {
            type: 3,
            name: 'boss',
            description: 'the name of the boss',
            required: true,
        },
    ],
};
