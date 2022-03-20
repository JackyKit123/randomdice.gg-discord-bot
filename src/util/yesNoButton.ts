import {
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    ReplyMessageOptions,
} from 'discord.js';
import notYourButtonResponse from './notYourButtonResponse';

export async function checkIfUserIsInteractionInitiator(
    interaction: ButtonInteraction
): Promise<boolean> {
    if (!interaction.inCachedGuild()) return false;
    const {
        message: { content, interaction: reply },
        member,
        client: { user: clientUser },
    } = interaction;

    if (reply?.user.id === clientUser?.id) {
        if (!content.startsWith(member.toString())) {
            await notYourButtonResponse(interaction);
            return false;
        }
    } else if (reply?.user.id !== member.id) {
        await notYourButtonResponse(interaction);
        return false;
    }
    return true;
}

export async function onNoButtonClick(
    interaction: ButtonInteraction
): Promise<void> {
    if (!(await checkIfUserIsInteractionInitiator(interaction))) return;
    if (!interaction.inCachedGuild()) return;
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
