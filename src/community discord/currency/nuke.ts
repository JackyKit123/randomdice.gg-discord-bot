import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    ApplicationCommandData,
    ButtonInteraction,
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
import { checkIfUserIsInteractionInitiator } from 'util/notYourButtonResponse';
import wait from 'util/wait';
import disableButtons from 'util/disabledButtons';

async function memberIsPrestigeX(
    interaction: ButtonInteraction<'cached'> | CommandInteraction<'cached'>
) {
    const { member } = interaction;

    const prestigeLevel = getPrestigeLevel(member);
    const profile = cacheData['discord_bot/community/currency']?.[member.id];

    if (prestigeLevel !== 10 || profile?.prestige !== 10) {
        await interaction.reply({
            content: 'Nuke is only available for users with Prestige X.',
            ephemeral: true,
        });
        return false;
    }
    return true;
}

async function checkExpired(interaction: ButtonInteraction<'cached'>) {
    if (Date.now() - interaction.message.createdTimestamp > 1000 * 60) {
        await interaction.update(disableButtons(interaction.message));
        await interaction.followUp({
            content: 'This button has expired, please initiate a new one.',
            ephemeral: true,
        });
        return true;
    }
    return false;
}

async function nukeConfirmation(
    interaction: CommandInteraction | ButtonInteraction,
    content: string,
    button: MessageButton
) {
    const messageOption = {
        content,
        components: [new MessageActionRow().setComponents([button])],
    };
    await interaction.reply(messageOption);
    await wait(60 * 1000);
    await interaction.editReply(disableButtons(messageOption));
}

export default async function nuke(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    if (!(await memberIsPrestigeX(interaction))) return;

    await nukeConfirmation(
        interaction,
        `${'⚠️'.repeat(
            12
        )}\n**Nuke is a permanent action.\nIt resets all your progress, record, your coins, everything. You will lose all your prestige roles and begin fresh.\nThis is only for the braves ~~and no lives~~.** Are you sure you want to nuke?`,
        new MessageButton()
            .setLabel('Yes')
            .setStyle('SUCCESS')
            .setCustomId('nuke-yes')
            .setEmoji('✅')
    );
}

export async function nukeConfirmed(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    const { member, guild } = interaction;
    const profile = cacheData['discord_bot/community/currency']?.[member.id];

    await member.roles.remove([
        ...Object.values(prestigeRoles),
        roleIds['Weekly Top 5'],
        roleIds['100 Daily Streaks'],
    ]);

    if (!member.roles.cache.hasAny(...tier2RoleIds)) {
        const customRole =
            cacheData['discord_bot/community/customroles']?.[member.id];
        if (customRole) {
            await guild.roles.cache.get(customRole)?.delete();
            await database
                .ref(`discord_bot/community/customroles/${member.id}`)
                .remove();
        }
    }

    if (!member.roles.cache.hasAny(...tier3RoleIds)) {
        const customReact =
            cacheData['discord_bot/community/customreact']?.[member.id];
        if (customReact) {
            await guild.emojis.cache.get(customReact)?.delete();
            await database
                .ref(`discord_bot/community/customreact/${member.id}`)
                .remove();
        }
    }

    if (!member.roles.cache.hasAny(...tier1RoleIds)) {
        await member.roles.remove(
            Array.from(member.roles.cache.filter(role => !!role.color).values())
        );
    }

    const nuked = profile?.nuked ?? 0;
    await database.ref(`discord_bot/community/currency/${member.id}`).set({
        nuked: nuked + 1,
    });
    await interaction.reply(
        'https://tenor.com/view/explosion-mushroom-cloud-atomic-bomb-bomb-boom-gif-4464831'
    );
}

export async function confirmNukeButton(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    if (
        !(await checkIfUserIsInteractionInitiator(interaction)) ||
        !(await memberIsPrestigeX(interaction)) ||
        (await checkExpired(interaction))
    )
        return;

    await interaction.message.edit(disableButtons(interaction.message));

    switch (interaction.customId) {
        case 'nuke-yes':
            await nukeConfirmation(
                interaction,
                `${alert.repeat(12)}\n${
                    interaction.member
                } Are you really sure? Press the red button again to confirm.`,
                new MessageButton()
                    .setLabel('Affirmative')
                    .setStyle('DANGER')
                    .setCustomId('nuke-double-yes')
                    .setEmoji('⭕')
            );
            break;
        case 'nuke-double-yes':
            await nukeConfirmation(
                interaction,
                `*Final Press*\n*Purge the existence*`,
                new MessageButton()
                    .setLabel('THE NUKE BUTTON')
                    .setStyle('DANGER')
                    .setCustomId('nuke-triple-yes')
                    .setEmoji(nukeEmoji)
            );
            break;
        case 'nuke-triple-yes':
            await nukeConfirmed(interaction);
            break;
        default:
    }
}

export const commandData: ApplicationCommandData = {
    name: 'nuke',
    description: 'Wait WHAT???',
    defaultPermission: false,
};
