import roleIds from 'config/roleId';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import cooldown from 'util/cooldown';
import wait from 'util/wait';

function parseColorIntIntoRgb(color: number) {
    /* eslint-disable no-bitwise */
    const r = color >> 16;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return { r, g, b };
}

export default async function inkPen(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const {
        options,
        guild: { roles },
    } = interaction;

    const target = options.getMember('target', true);
    const inkedRole = roles.cache.get(roleIds.Inked);
    if (!inkedRole) {
        await interaction.reply(
            'The Inked role does not exist. Please contact an admin.'
        );
        return;
    }

    if (
        !(await cooldown(interaction, {
            default: 5 * 60 * 1000,
            donator: 5 * 60 * 1000,
        }))
    )
        return;

    const { r, g, b } = parseColorIntIntoRgb(target.displayColor || 16777215);

    const darkenColor = (color: number, amount: number) => {
        const hex = Math.round(color / 1.2 ** amount).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };

    await inkedRole.setColor(
        `#${darkenColor(r, 4)}${darkenColor(g, 4)}${darkenColor(b, 4)}`
    );
    await target.roles.add(inkedRole);
    await interaction.reply(`${target} has been inked!`);

    await wait(1000 * 60);
    await inkedRole.setColor(
        `#${darkenColor(r, 3)}${darkenColor(g, 3)}${darkenColor(b, 3)}`
    );

    await wait(1000 * 60);
    await inkedRole.setColor(
        `#${darkenColor(r, 2)}${darkenColor(g, 2)}${darkenColor(b, 2)}`
    );

    await wait(1000 * 60);
    await inkedRole.setColor(
        `#${darkenColor(r, 1)}${darkenColor(g, 1)}${darkenColor(b, 1)}`
    );

    await wait(1000 * 60);
    await target.roles.remove(inkedRole);
}

export const commandData: ApplicationCommandData = {
    name: 'ink-pen',
    description: 'Darkens someone with some ink',
    defaultPermission: false,
    options: [
        {
            name: 'target',
            description: 'The person to be inked at',
            type: 'USER',
        },
    ],
};
