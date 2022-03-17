import { randomDiceWebsiteUrl } from 'config/url';
import { isJackykit } from 'config/users';
import Discord, {
    ButtonInteraction,
    CommandInteraction,
    Message,
    ContextMenuInteraction,
} from 'discord.js';
import cache from './cache';
import parseMsIntoReadableText from './parseMS';
import { reply } from './typesafeReply';

const commandCooldown = new Map<string, Map<string, number>>();
export default async function Cooldown(
    input:
        | Message
        | ButtonInteraction
        | CommandInteraction
        | ContextMenuInteraction,
    command: string,
    cooldown: {
        default: number;
        donator: number;
    }
): Promise<boolean> {
    const author =
        (input as Discord.Interaction).user ||
        (input as Discord.Message).author;

    if (isJackykit(author)) return false;

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
        await reply(
            input,
            {
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
                            )}\` cooldown.${
                                cooldown.donator === cooldown.default
                                    ? ''
                                    : ` ${
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
                                              : `\nIf you have subscribed to patreon, please login and link your account on [randomdice.gg website](${randomDiceWebsiteUrl()}).`
                                      }`
                            }`
                        )
                        .setFooter({
                            text: userIsDonator
                                ? 'Nice You are a donator!'
                                : randomDiceWebsiteUrl('/about/patreon'),
                        }),
                ],
            },
            input instanceof ButtonInteraction ||
                input instanceof ContextMenuInteraction
        );
        return true;
    }

    commandCooldown.set(command, commandCooldownList.set(author.id, now));
    return false;
}
