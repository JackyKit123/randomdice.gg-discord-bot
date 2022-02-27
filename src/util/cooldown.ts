import Discord from 'discord.js';
import cache from './cache';
import parseMsIntoReadableText from './parseMS';

const commandCooldown = new Map<string, Map<string, number>>();
export default async function Cooldown(
    input: Discord.Message | Discord.Interaction,
    command: string,
    cooldown: {
        default: number;
        donator: number;
    }
): Promise<boolean> {
    const author =
        (input as Discord.Interaction).user ||
        (input as Discord.Message).author;
    const { channel } = input;

    if (process.env.DEV_USERS_ID?.includes(author.id)) {
        return false;
    }

    const now = Date.now().valueOf();
    const commandCooldownList = commandCooldown.get(command) || new Map();
    const userCooldown = commandCooldownList.get(author.id) || 0;

    const { users } = cache;
    const userIsDonator = Object.values(users).some(
        user =>
            user['linked-account'].discord === author.id &&
            Boolean(user['patreon-tier'])
    );

    if (
        now - userCooldown <=
        (userIsDonator ? cooldown.donator : cooldown.default)
    ) {
        if (cooldown.donator === cooldown.default) {
            await (channel ?? author).send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle('Slow Down!')
                        .setColor('#6ba4a5')
                        .setDescription(
                            `Your command is still on \`${parseMsIntoReadableText(
                                cooldown.default - (now - userCooldown)
                            )}\` cooldown.`
                        )
                        .setFooter(
                            userIsDonator
                                ? 'Nice You are a donator!'
                                : 'https://randomdice.gg/about/patreon'
                        ),
                ],
            });
        } else {
            await (channel ?? author).send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle('Slow Down!')
                        .setColor('#6ba4a5')
                        .setDescription(
                            `Your command is still on \`${parseMsIntoReadableText(
                                (userIsDonator
                                    ? cooldown.donator
                                    : cooldown.default) -
                                    (now - userCooldown)
                            )}\` cooldown. ${
                                userIsDonator
                                    ? 'Since you are a [Patreon donator](https://www.patreon.com/RandomDiceCommunityWebsite), your cooldown is reduced'
                                    : '[Patreon donators](https://www.patreon.com/RandomDiceCommunityWebsite) can have their command cooldown reduced'
                            } from \`${parseMsIntoReadableText(
                                cooldown.default
                            )}\` to \`${parseMsIntoReadableText(
                                cooldown.donator
                            )}\`${
                                userIsDonator
                                    ? ''
                                    : '\nIf you have subscribed to patreon, please login and link your account on [randomdice.gg website](https://randomdice.gg).'
                            }`
                        )
                        .setFooter(
                            userIsDonator
                                ? 'Nice You are a donator!'
                                : 'https://randomdice.gg/about/patreon'
                        ),
                ],
            });
        }
        return true;
    }

    commandCooldown.set(command, commandCooldownList.set(author.id, now));
    return false;
}
