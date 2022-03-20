import {
    ButtonInteraction,
    CommandInteraction,
    Guild,
    MessageEmbed,
} from 'discord.js';

export const getDefaultEmbed = (guild: Guild | null): MessageEmbed =>
    new MessageEmbed()
        .setAuthor({
            name: 'randomdice.gg Server',
            iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
        })
        .setTitle('Dice Coins Raffle');

export const noActiveRaffleResponse = async (
    interaction: ButtonInteraction | CommandInteraction
): Promise<void> =>
    interaction.reply({
        embeds: [
            getDefaultEmbed(interaction.guild)
                .setColor('#ff0000')
                .setDescription('There is no active raffle at the moment'),
        ],
        ephemeral: interaction instanceof ButtonInteraction,
    });
