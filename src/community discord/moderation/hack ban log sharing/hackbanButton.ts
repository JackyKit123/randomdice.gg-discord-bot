import { isCommunityDiscord } from 'config/guild';
import { ButtonInteraction, MessageActionRow, MessageButton } from 'discord.js';
import disableButtons from 'util/disabledButtons';
import { suppressUnknownUser } from 'util/suppressErrors';
import { banHammer } from 'config/emojiId';
import { writeModLog } from '../modlog';
import {
    checkModActionValidity,
    dmOffender,
    startHackWarnTimer,
} from '../util';
import Reasons from '../reasons.json';

export const getHackBanLogButtonsComponent = (
    offenderIsMember: boolean,
    offenderIsBanned: boolean | 'Unknown'
): [MessageActionRow] => [
    new MessageActionRow().setComponents([
        new MessageButton()
            .setCustomId('hackban-log-warn')
            .setLabel('Warn')
            .setStyle('PRIMARY')
            .setEmoji('⚠️')
            .setDisabled(!offenderIsMember),
        new MessageButton()
            .setCustomId('hackban-log-ban')
            .setLabel('Ban')
            .setStyle('DANGER')
            .setEmoji(banHammer)
            .setDisabled(offenderIsBanned === true),
        new MessageButton()
            .setCustomId('hackban-log-no-action')
            .setLabel('No Action Needed')
            .setStyle('SECONDARY')
            .setEmoji('🆗')
            .setDisabled(offenderIsBanned === true),
    ]),
];

export default async function banLogButtons(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    const {
        channel,
        guild,
        member: moderator,
        customId,
        client: { user: clientUser },
        message,
    } = interaction;
    const { members, client } = guild;
    const { content, embeds, components } = message;
    if (!clientUser) return;

    const offenderId =
        embeds[0]?.footer?.text.match(/^User ID: (\d{18})$/)?.[1];
    if (!offenderId) {
        await interaction.reply({
            content:
                'I could not find the user ID in the footer, please contact the bot developer.',
            ephemeral: true,
        });
        return;
    }

    const offender = await client.users
        .fetch(offenderId)
        .catch(suppressUnknownUser);

    if (!offender) {
        await interaction.reply({
            content:
                'I could not find the user, please contact the bot developer.',
            ephemeral: true,
        });
        return;
    }

    const offenderMember = members.cache.get(offenderId);

    let reason: string;
    let interactionReply: string;
    let action: 'ban' | 'warn';
    const messageWithButtonsDisabled = disableButtons({
        content,
        embeds,
        components,
    });
    switch (customId) {
        case 'hackban-log-ban':
            reason = Reasons['Member in Hack Servers'];
            interactionReply = `${offender} has been banned for ${reason}`;
            action = 'ban';
            break;
        case 'hackban-log-warn':
            reason = Reasons['Warn to Leave Hack Servers'];
            interactionReply = `${offender} has been warned for ${reason}`;
            action = 'warn';
            break;
        case 'hackban-log-no-action':
            await interaction.update(messageWithButtonsDisabled);
            return;
        default:
            return;
    }

    if (!(await checkModActionValidity(interaction, offenderId, action)))
        return;

    await dmOffender(offender, moderator, action, reason, null);

    if (isCommunityDiscord(guild))
        await writeModLog(offender, reason, moderator.user, action, null);

    if (action === 'ban')
        await members.ban(offenderId, {
            reason,
        });

    await interaction.reply(interactionReply);

    await message.edit(messageWithButtonsDisabled);

    if (action === 'warn')
        await startHackWarnTimer(moderator, offenderMember, channel);
}
