import Discord from 'discord.js';
import fetchMentionString from 'util/fetchMention';
import cooldown from 'util/cooldown';
import commandCost from './commandCost';
import roleIds, { moderatorRoleIds } from 'config/roleId';

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
    if (!target.roles.cache.has(roleIds['Bed time'])) {
        if (bedtimeForReal) {
            if (!member?.roles.cache.hasAny(...moderatorRoleIds)) {
                await channel.send(
                    "You don't have sufficient permission to use argument `--for-real`"
                );
                return;
            }
        }
        if (!(await commandCost(message, 500))) {
            return;
        }
        await target.roles.add(roleIds['Bed time']);
        setTimeout(
            () => {
                try {
                    target.roles.remove(roleIds['Bed time']);
                } catch {
                    // nothing
                }
            },
            bedtimeForReal ? 1000 * 60 * 60 * 8 : 1000 * 10
        );
        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle('Temporary role added')
                    .setColor(5496236)
                    .setDescription(
                        `${target} has been granted the <@&${
                            roleIds['Bed time']
                        }> role for ${bedtimeForReal ? '8 hours' : 'now'}.`
                    ),
            ],
        });
    } else {
        await channel.send(
            'You cannot use `!bedtime` on someone who already has this role.'
        );
    }
}
