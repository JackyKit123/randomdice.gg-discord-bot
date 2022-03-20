import { ButtonInteraction, MessageComponentInteraction } from 'discord.js';

export default async function notYourButtonResponse(
    interaction: ButtonInteraction | MessageComponentInteraction
): Promise<void> {
    let buttonType = 'button';
    if (interaction.isMessageComponent()) {
        if (interaction.isSelectMenu()) {
            buttonType = 'menu';
        }
    }
    await interaction.reply({
        content: `This ${buttonType} is not for you, please initiate a new command`,
        ephemeral: true,
    });
}
