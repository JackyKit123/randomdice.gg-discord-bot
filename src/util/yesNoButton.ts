import {
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    ReplyMessageOptions,
} from 'discord.js';
import { checkIfUserIsInteractionInitiator } from './notYourButtonResponse';

export async function onNoButtonClick(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    if (await checkIfUserIsInteractionInitiator(interaction))
        await interaction.message.delete();
}

export default async function yesNoButton(
    interaction: CommandInteraction | ButtonInteraction,
    promptQuestion: string | ReplyMessageOptions,
    name?: string
): Promise<void> {
    let uniqueId = name;
    if (interaction instanceof CommandInteraction) {
        uniqueId = interaction.commandName;
        const subcommand = interaction.options.data.find(
            ({ type }) => type === 'SUB_COMMAND'
        )?.name;
        if (subcommand) {
            uniqueId += `-${subcommand}`;
        }
    } else if (interaction instanceof ButtonInteraction) {
        uniqueId = interaction.customId;
    }
    if (!uniqueId) {
        throw new Error('Unique ID is required');
    }

    await interaction.reply({
        ...(typeof promptQuestion === 'string'
            ? { content: promptQuestion }
            : promptQuestion),
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId(`yes-no-button-✅-${uniqueId}`)
                    .setLabel('Yes')
                    .setEmoji('✅')
                    .setStyle('SUCCESS'),
                ...(interaction.inCachedGuild()
                    ? [
                          new MessageButton()
                              .setCustomId(`yes-no-button-❌-${uniqueId}`)
                              .setLabel('No')
                              .setEmoji('❌')
                              .setStyle('DANGER'),
                      ]
                    : []),
            ]),
        ],
        fetchReply: true,
    });
}
