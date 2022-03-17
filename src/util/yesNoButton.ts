import {
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    ReplyMessageOptions,
} from 'discord.js';

const awaitingYesNoButton = new Map<
    string,
    {
        interaction: CommandInteraction | ButtonInteraction;
        onYes: (i: ButtonInteraction) => unknown;
    }
>();

export async function onYesNoButtonClick(
    interaction: ButtonInteraction
): Promise<void> {
    const yesNoButtonOrigin = awaitingYesNoButton.get(interaction.message.id);

    if (!yesNoButtonOrigin) {
        await interaction.reply(
            'This button is too old to be used anymore. Please initiate a new command.'
        );
        return;
    }

    if (interaction.user.id !== yesNoButtonOrigin.interaction.user.id) {
        interaction.reply({
            content:
                'You cannot use this button because you did not initiate this command.',
            ephemeral: true,
        });
        return;
    }
    if (interaction.customId === 'yes-no-button-✅') {
        await yesNoButtonOrigin.onYes(interaction);
    }
    await yesNoButtonOrigin.interaction.deleteReply();
}

export default async function yesNoButton(
    interaction: CommandInteraction | ButtonInteraction,
    promptQuestion: string | ReplyMessageOptions,
    onYes: (i: ButtonInteraction) => unknown
): Promise<void> {
    const sentMessage = await interaction.reply({
        ...(typeof promptQuestion === 'string'
            ? { content: promptQuestion }
            : promptQuestion),
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('yes-no-button-✅')
                    .setLabel('Yes')
                    .setEmoji('✅')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('yes-no-button-❌')
                    .setLabel('No')
                    .setEmoji('❌')
                    .setStyle('DANGER'),
            ]),
        ],
        fetchReply: true,
    });

    awaitingYesNoButton.set(sentMessage.id, { interaction, onYes });
}
