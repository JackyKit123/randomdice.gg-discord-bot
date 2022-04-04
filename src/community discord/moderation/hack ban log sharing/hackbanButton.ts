import { isCommunityDiscord } from 'config/guild';
import { ButtonInteraction } from 'discord.js';
import disableButtons from 'util/disabledButtons';
import { suppressUnknownUser } from 'util/suppressErrors';
import { writeModLog } from '../modlog';
import {
    checkModActionValidity,
    dmOffender,
    startHackWarnTimer,
} from '../util';
import Reasons from '../reasons.json';

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
    const isBan = customId === 'hackban-log-ban';
    const isWarn = customId === 'hackban-log-warn';
    const action = ((isBan && 'ban') || (isWarn && 'warn')) as 'ban' | 'warn';

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

    const offenderMember = members.cache.get(offenderId);

    if (!(await checkModActionValidity(interaction, offenderId, action)))
        return;

    const reason = ((isBan && Reasons['Member in Hack Servers']) ||
        (isWarn && Reasons['Warn to Leave Hack Servers'])) as string;

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

    await dmOffender(offender, moderator, action, reason, null);

    if (isCommunityDiscord(guild)) {
        await writeModLog(offender, reason, moderator.user, action, null);
    }

    if (isBan)
        await members.ban(offenderId, {
            reason,
        });

    await interaction.reply(
        `${offender} has been ${(isBan && 'banned') || (isWarn && 'warned')}.`
    );

    if (isWarn) await startHackWarnTimer(moderator, offenderMember, channel);

    await message.edit(
        disableButtons({
            content,
            embeds,
            components,
        })
    );
}
