import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    UserContextMenuInteraction,
    ApplicationCommandData,
} from 'discord.js';
import { database } from 'register/firebase';
import cooldown from 'util/cooldown';
import cache from 'util/cache';
import { prestigeRoles } from 'config/roleId';
import { coinDice } from 'config/emojiId';
import {
    getPrestigeIcon,
    getPrestigeLevel,
} from 'community discord/util/checkPrestigeLevel';
import { getBalance } from './balance';

export default async function prestige(
    interaction: CommandInteraction | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, member, guild } = interaction;
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(
            interaction,
            {
                default: 20 * 1000,
                donator: 5 * 1000,
            },
            'prestige'
        )
    )
        return;

    const balance = await getBalance(interaction);
    if (balance === null) return;

    const prestigeLevel = getPrestigeLevel(member);

    if (prestigeLevel === 10) {
        await interaction.reply(
            'You are already max prestige, you cannot prestige anymore.'
        );
        return;
    }

    const nextPrestigeLevel = prestigeLevel + 1;
    const progress = balance / (nextPrestigeLevel * 250000);
    if (progress < 1) {
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setColor(member.displayHexColor)
                    .setTitle('Prestige Progress')
                    .setDescription(
                        `${'■'.repeat(
                            Math.max(0, Math.floor(progress * 10))
                        )}${'□'.repeat(
                            Math.min(
                                Math.max(10 - Math.floor(progress * 10), 0),
                                10
                            )
                        )}(${Math.floor(progress * 1000) / 10}%)`
                    )
                    .addField(
                        'Prestige Cost',
                        `${coinDice} ${numberFormat.format(
                            nextPrestigeLevel * 250000
                        )}`
                    )
                    .addField(
                        'Your Balance',
                        `${coinDice} ${numberFormat.format(balance)}`
                    ),
            ],
        });
        return;
    }

    const userIsDonator = Object.values(cache.users).find(
        user =>
            user['linked-account'].discord === member.id &&
            Boolean(user['patreon-tier'])
    );
    const tier = userIsDonator?.['patreon-tier'];
    let donation = 0;
    switch (tier) {
        case 1:
            donation = 5;
            break;
        case 2:
            donation = 10;
            break;
        case 3:
            donation = 20;
            break;
        case 4:
            donation = 50;
            break;
        default:
    }
    const confirmationMessage = await interaction.reply({
        content: `You can prestige now.\n⚠️ Warning, if you choose to prestige now, your balance and dice drawn will be reset in exchange for the **${
            guild.roles.cache.get(prestigeRoles[nextPrestigeLevel])?.name ||
            prestigeRoles[nextPrestigeLevel]
        }** role. Press the \`prestige me\` button if you want to prestige now.${
            donation
                ? `\n⭐Since you are a patreon donator, when you prestige, you can keep ${donation}% of your current balance!`
                : ''
        }`,
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel('Prestige Me')
                    .setStyle('SUCCESS')
                    .setCustomId('prestige-me')
                    .setEmoji(
                        getPrestigeIcon(client, nextPrestigeLevel) ?? coinDice
                    ),
            ]),
        ],
        fetchReply: true,
    });
    confirmationMessage
        .createMessageComponentCollector({
            time: 60 * 1000,
        })
        .on('collect', async i => {
            if (i.user.id !== member.id) {
                await i.reply({
                    content: 'This button is not for you.',
                    ephemeral: true,
                });
                return;
            }
            if (i.customId === 'prestige-me') {
                await member.roles.add(
                    prestigeRoles[nextPrestigeLevel],
                    'Member Prestige'
                );
                await database
                    .ref(`discord_bot/community/currency/${member.id}/prestige`)
                    .set(nextPrestigeLevel);
                await database
                    .ref(`discord_bot/community/currency/${member.id}/balance`)
                    .set(Math.round((balance * donation) / 100));
                await database
                    .ref(
                        `discord_bot/community/currency/${member.id}/diceDrawn`
                    )
                    .set(0);
                await i.reply(
                    `Congratulations on achieving **${
                        guild.roles.cache.get(prestigeRoles[nextPrestigeLevel])
                            ?.name || prestigeRoles[nextPrestigeLevel]
                    }**`
                );
            }
        });
}

export const commandData: ApplicationCommandData = {
    name: 'prestige',
    description: 'Exchange all you balance for a prestige role.',
};
