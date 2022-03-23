import { isCommunityDiscord } from 'config/guild';
import roleIds from 'config/roleId';
import { ButtonInteraction, ClientUser, MessageActionRow } from 'discord.js';
import notYourButtonResponse, {
    getMessageFromReference,
} from 'util/notYourButtonResponse';
import yesNoButton from 'util/yesNoButton';

export default async function closeApplication(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    const {
        message: { author, embeds },
        channel,
        guild,
        client: { user: clientUser },
        user,
        customId,
    } = interaction;

    const applicationName = embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;

    if (
        !isCommunityDiscord(guild) ||
        !(clientUser?.id === author.id) ||
        !applicationName ||
        !channel?.isText() ||
        channel.isThread() ||
        !channel.name.match(/^.{2,32}-\d{4}-.+-application$/)
    ) {
        await interaction.reply(
            'Invalid application channel. Please contact an admin if you believe this is an error.'
        );
        return;
    }

    const memberId = channel.permissionOverwrites.cache.find(
        overwrite => overwrite.type === 'member'
    )?.id;

    if (!memberId || memberId !== user.id) {
        await notYourButtonResponse(interaction);
        return;
    }

    if (
        channel.messages.cache.find(
            ({ content }) =>
                content ===
                `${user}, Please confirm again that you are ${
                    customId === 'application-submit'
                        ? 'ready to submit.\n⚠️ Warning, once you confirm submit, the channel will be locked down and admins will be pinged to review your application, you cannot send new messages here anymore.'
                        : ''
                }${
                    customId === 'application-cancel'
                        ? 'cancelling the application.\n⚠️ Warning, once you confirm cancel, the channel will be deleted, this action cannot be undone.'
                        : ''
                }`
        )
    ) {
        await interaction.reply({
            content:
                'There is already a confirmation button in this channel. Please use that button to confirm.',
            ephemeral: true,
        });
        return;
    }

    switch (customId) {
        case 'application-submit':
            await yesNoButton(
                interaction,
                `${user}, Please confirm again that you are ready to submit.\n⚠️ Warning, once you confirm submit, the channel will be locked down and admins will be pinged to review your application, you cannot send new messages here anymore.`
            );
            break;
        case 'application-cancel':
            await yesNoButton(
                interaction,
                `${user}, Please confirm again that you are cancelling the application.\n⚠️ Warning, once you confirm cancel, the channel will be deleted, this action cannot be undone.`
            );
            break;
        default:
    }
}

export async function applicationConfirmationButtons(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { customId, channel, guild, user } = interaction;

    const message = await getMessageFromReference(interaction.message);

    const applicationName = message?.embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;

    if (!applicationName || !channel || channel.isThread()) {
        await interaction.reply({
            content: 'Invalid Application Channel',
            ephemeral: true,
        });
        return;
    }

    if (customId === 'yes-no-button-✅-application-submit') {
        await channel.permissionOverwrites.edit(
            guild.roles.everyone,
            {
                SEND_MESSAGES: false,
            },
            {
                reason: 'Application Submit',
            }
        );
        await interaction.reply('Application submitted!');
        await interaction.followUp(`Locked down ${channel}`);
        await channel.send(
            `<@&${
                roleIds.Admin
            }>, ${user} has submitted the ${applicationName.toLowerCase()}.`
        );
        const initMessage = (await channel.messages.fetch()).last();
        if (initMessage?.author instanceof ClientUser) {
            const components = initMessage.components[0]?.components.map(
                component => component.setDisabled(true)
            );
            await initMessage.edit({
                embeds: initMessage.embeds,
                components: [new MessageActionRow().setComponents(components)],
            });
        }
    }

    if (customId === 'yes-no-button-✅-application-cancel')
        await channel.delete();
}
