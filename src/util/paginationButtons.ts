import {
    DiscordAPIError,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageSelectMenu,
    User,
} from 'discord.js';

type HandlerFunction = (
    sentMessage: Message,
    initiateUser: User,
    embeds: MessageEmbed[]
) => void;

export default function getPaginationComponents(
    totalPages: number,
    initialPage = 0
): { components: MessageActionRow[]; collectorHandler: HandlerFunction } {
    let currentPage = initialPage;
    const buttons = [
        new MessageButton()
            .setEmoji('⏪')
            .setStyle('PRIMARY')
            .setCustomId('first')
            .setDisabled(initialPage === 0),
        new MessageButton()
            .setEmoji('◀️')
            .setStyle('PRIMARY')
            .setCustomId('prev')
            .setDisabled(initialPage === 0),
        new MessageButton()
            .setEmoji('▶️')
            .setStyle('PRIMARY')
            .setCustomId('next')
            .setDisabled(initialPage === totalPages),
        new MessageButton()
            .setEmoji('⏩')
            .setStyle('PRIMARY')
            .setCustomId('last')
            .setDisabled(initialPage === totalPages),
        new MessageButton()
            .setEmoji('❌')
            .setStyle('DANGER')
            .setCustomId('close'),
    ];
    const select = new MessageSelectMenu()
        .setCustomId('select')
        .setPlaceholder('Page')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new Array(totalPages).fill('').map((_, i) => ({
                label: `Page ${i + 1}`,
                description: `Go to page ${i + 1}`,
                value: String(i),
                default: currentPage === 1,
            }))
        );

    let components = [new MessageActionRow().addComponents(buttons)];
    if (totalPages <= 25) {
        components = [
            ...components,
            new MessageActionRow().addComponents(select),
        ];
    }

    const collectorHandler: HandlerFunction = (
        sentMessage,
        initiateUser,
        embeds
    ) => {
        const collector = sentMessage.createMessageComponentCollector({
            filter: interaction => interaction.user.id === initiateUser.id,
            time: 180000,
        });

        collector.on('collect', async interaction => {
            const lastPage = totalPages - 1;
            switch (interaction.customId) {
                case 'first':
                    currentPage = 0;
                    break;
                case 'prev':
                    currentPage -= 1;
                    break;
                case 'next':
                    currentPage += 1;
                    break;
                case 'last':
                    currentPage = lastPage;
                    break;
                case 'select':
                    if (interaction.isSelectMenu()) {
                        currentPage = Number(interaction.values[0]);
                    }
                    break;
                case 'close':
                    collector.stop();
                    return;
                default:
                    return;
            }
            let updatedComponents = [
                new MessageActionRow().addComponents(
                    buttons.map(component =>
                        component.setDisabled(
                            ((component.customId === 'first' ||
                                component.customId === 'prev') &&
                                currentPage === 0) ||
                                ((component.customId === 'next' ||
                                    component.customId === 'last') &&
                                    currentPage === lastPage)
                        )
                    )
                ),
            ];
            if (totalPages <= 25) {
                updatedComponents = [
                    ...updatedComponents,
                    new MessageActionRow().addComponents(select),
                ];
            }
            if (sentMessage.editable)
                await interaction.update({
                    embeds: [embeds[currentPage]],
                    components: updatedComponents,
                });
        });

        collector.on('end', async () => {
            try {
                await sentMessage.delete();
            } catch (err) {
                if ((err as DiscordAPIError).message !== 'Unknown Message')
                    throw err;
            }
        });
    };

    return {
        components,
        collectorHandler,
    };
}
