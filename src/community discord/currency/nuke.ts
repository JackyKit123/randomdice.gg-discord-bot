import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    UserContextMenuInteraction,
    ApplicationCommandData,
} from 'discord.js';
import { database } from 'register/firebase';
import { alert, nuke as nukeEmoji } from 'config/emojiId';
import { getPrestigeLevel } from 'community discord/util/checkPrestigeLevel';
import roleIds, {
    prestigeRoles,
    tier1RoleIds,
    tier2RoleIds,
    tier3RoleIds,
} from 'config/roleId';
import cacheData from 'util/cache';

export default async function nuke(
    interaction: CommandInteraction | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, guild } = interaction;

    const prestigeLevel = getPrestigeLevel(member);

    if (prestigeLevel !== 10) {
        await interaction.reply(
            'Nuke is only available for users with Prestige X.'
        );
        return;
    }

    let confirmationMessage = await interaction.reply({
        content: `${'⚠️'.repeat(
            12
        )}\n**Nuke is a permanent action.\nIt resets all your progress, record, your coins, everything. You will lose all your prestige roles and begin fresh.\nThis is only for the braves ~~and no lives~~.** Are you sure you want to nuke?`,
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setLabel('Yes')
                    .setStyle('SUCCESS')
                    .setCustomId('nuke-yes')
                    .setEmoji('✅'),
            ]),
        ],
        fetchReply: true,
    });
    confirmationMessage
        .createMessageComponentCollector()
        .on('collect', async i => {
            if (i.user.id !== member.id) {
                await i.reply({
                    content: 'This button is not for you.',
                    ephemeral: true,
                });
                return;
            }
            if (i.customId !== 'nuke-yes') return;
            confirmationMessage = await i.reply({
                content: `${alert.repeat(
                    12
                )}\n${member} Are you really sure? Press the red button again to confirm.`,
                components: [
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setLabel('Affirmative')
                            .setStyle('DANGER')
                            .setCustomId('nuke-double-yes')
                            .setEmoji('⭕'),
                    ]),
                ],
                fetchReply: true,
            });
            confirmationMessage
                .createMessageComponentCollector()
                .on('collect', async ii => {
                    if (ii.user.id !== member.id) {
                        await ii.reply({
                            content: 'This button is not for you.',
                            ephemeral: true,
                        });
                        return;
                    }
                    if (ii.customId !== 'nuke-double-yes') return;
                    confirmationMessage = await ii.reply({
                        content: `*Final Press*\n*Purge the existence*`,
                        components: [
                            new MessageActionRow().addComponents([
                                new MessageButton()
                                    .setLabel('THE NUKE BUTTON')
                                    .setStyle('DANGER')
                                    .setCustomId('nuke-triple-yes')
                                    .setEmoji(nukeEmoji),
                            ]),
                        ],
                        fetchReply: true,
                    });
                    confirmationMessage
                        .createMessageComponentCollector()
                        .on('collect', async iii => {
                            if (iii.user.id !== member.id) {
                                await iii.reply({
                                    content: 'This button is not for you.',
                                    ephemeral: true,
                                });
                                return;
                            }
                            await member.roles.remove([
                                ...Object.values(prestigeRoles),
                                roleIds['Weekly Top 5'],
                                roleIds['100 Daily Streaks'],
                            ]);
                            if (!member.roles.cache.hasAny(...tier2RoleIds)) {
                                const customRole =
                                    cacheData[
                                        'discord_bot/community/customroles'
                                    ]?.[member.id];
                                if (customRole) {
                                    await guild.roles.cache
                                        .get(customRole)
                                        ?.delete();
                                    await database
                                        .ref(
                                            `discord_bot/community/customroles/${member.id}`
                                        )
                                        .remove();
                                }
                            }
                            if (!member.roles.cache.hasAny(...tier3RoleIds)) {
                                const customReact =
                                    cacheData[
                                        'discord_bot/community/customreact'
                                    ]?.[member.id];
                                if (customReact) {
                                    await guild.emojis.cache
                                        .get(customReact)
                                        ?.delete();
                                    await database
                                        .ref(
                                            `discord_bot/community/customreact/${member.id}`
                                        )
                                        .remove();
                                }
                            }
                            if (!member.roles.cache.hasAny(...tier1RoleIds)) {
                                await member.roles.remove(
                                    Array.from(
                                        member.roles.cache
                                            .filter(role => !!role.color)
                                            .values()
                                    )
                                );
                            }
                            const nuked =
                                cacheData['discord_bot/community/currency']?.[
                                    member.id
                                ]?.nuked ?? 0;
                            await database
                                .ref(
                                    `discord_bot/community/currency/${member.id}`
                                )
                                .set({
                                    nuked: nuked + 1,
                                });
                            await iii.reply(
                                'https://tenor.com/view/explosion-mushroom-cloud-atomic-bomb-bomb-boom-gif-4464831'
                            );
                        });
                });
        });
}

export const commandData: ApplicationCommandData = {
    name: 'nuke',
    description: 'Wait WHAT???',
    defaultPermission: false,
};
