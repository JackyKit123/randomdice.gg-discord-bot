import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import roleIds, { moderatorRoleIds } from 'config/roleId';
import commandCost from './commandCost';

export default async function bedtime(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, member } = interaction;

    const target = options.getMember('member', true);
    const forReal = options.getBoolean('for-real');

    if (!target.roles.cache.has(roleIds['Bed time'])) {
        if (forReal) {
            if (!member?.roles.cache.hasAny(...moderatorRoleIds)) {
                await interaction.reply(
                    "You don't have sufficient permission to use argument `for-real`"
                );
                return;
            }
        }
        if (
            (await cooldown(interaction, {
                default: 60 * 1000,
                donator: 30 * 1000,
            })) ||
            !(await commandCost(interaction, 500))
        ) {
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
            forReal ? 1000 * 60 * 60 * 8 : 1000 * 10
        );
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Temporary role added')
                    .setColor(5496236)
                    .setDescription(
                        `${target} has been granted the <@&${
                            roleIds['Bed time']
                        }> role for ${forReal ? '8 hours' : 'now'}.`
                    ),
            ],
        });
    } else {
        await interaction.reply(
            'You cannot use `/bedtime` on someone who already has this role.'
        );
    }
}

export const commandData: ApplicationCommandData = {
    name: 'bedtime',
    description: `Give a member the bedtime role for a while. Time to sleep uh?`,
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'The member who should go to bed',
            required: true,
        },
        {
            name: 'for-real',
            type: 'BOOLEAN',
            description: 'Whether the member should go to bed for real',
        },
    ],
};
