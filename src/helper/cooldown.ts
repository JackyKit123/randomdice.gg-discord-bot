import * as Discord from 'discord.js';
import cache from './cache';

let commandCooldown = new Map<string, Map<string, number>>();
export default async function Cooldown(
    message: Discord.Message,
    command: string,
    cooldown: {
        default: number;
        donator: number;
    }
): Promise<boolean> {
    const { author, channel } = message;

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

    const parseMsIntoReadableText = (ms: number): string => {
        const day = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hour = Math.floor(
            (ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minute = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        const tenthseconds = Math.floor((ms % 1000) / 100);

        return `${day > 0 ? `${day}d ` : ''}${hour > 0 ? `${hour}h ` : ''}${
            minute > 0 ? `${minute}m ` : ''
        }${seconds}${tenthseconds > 0 ? `.${tenthseconds}` : ''}s`;
    };

    if (
        now - userCooldown <=
        (userIsDonator ? cooldown.donator : cooldown.default)
    ) {
        if (cooldown.donator === cooldown.default) {
            await channel.send(
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
                    )
            );
        } else {
            await channel.send(
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
                    )
            );
        }
        return true;
    }

    commandCooldown = commandCooldown.set(
        command,
        commandCooldownList.set(author.id, now)
    );
    return false;
}
