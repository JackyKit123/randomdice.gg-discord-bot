import * as Discord from 'discord.js';
import fetchMentionString from '../../../helper/fetchMention';
import commandCost from './commandCost';
import cooldown from '../../../helper/cooldown';

export default async function bedtime(message: Discord.Message): Promise<void> {
    const { content, channel, guild, member } = message;

    if (
        !guild ||
        (await cooldown(message, '!bedtime', {
            default: 60 * 1000,
            donator: 30 * 1000,
        }))
    )
        return;

    const memberArg = content.split(' ')[1];
    const target = await fetchMentionString(memberArg, guild, {
        content,
        mentionIndex: 1,
    });

    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!bedtime <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }

    const bedtimeForReal = /!bedtime\b.* --for-real\b/i.test(content);
    if (!target.roles.cache.has('804223995025162280')) {
        if (bedtimeForReal) {
            if (!member?.hasPermission('MANAGE_ROLES')) {
                await channel.send(
                    'You need to have `MANAGE_ROLES` permission to use argument `--for-real`'
                );
                return;
            }
        }
        if (!(await commandCost(message, 500))) {
            return;
        }
        await target.roles.add('804223995025162280');
        setTimeout(
            () => {
                try {
                    target.roles.remove('804223995025162280');
                } catch {
                    // nothing
                }
            },
            bedtimeForReal ? 1000 * 60 * 60 * 8 : 1000
        );
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Temporary role added')
                .setColor(5496236)
                .setDescription(
                    `${target} has been granted the <@&804223995025162280> role for ${
                        bedtimeForReal ? '8 hours' : 'now'
                    }.`
                )
        );
    } else {
        await channel.send(
            'You cannot use `!bedtime` on someone who already has this role.'
        );
    }
}
