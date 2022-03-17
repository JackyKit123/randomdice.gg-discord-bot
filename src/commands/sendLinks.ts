import { randomDiceWebsiteUrl } from 'config/url';
import {
    ApplicationCommandData,
    ClientUser,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
} from 'discord.js';
import cooldown from 'util/cooldown';
import getBrandingEmbed from './util/getBrandingEmbed';

export default async function sendLinks(
    interaction: CommandInteraction
): Promise<void> {
    const { commandName, client, options } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }
    switch (commandName) {
        case 'website': {
            const path = options.getString('path');
            await interaction.reply(
                randomDiceWebsiteUrl(encodeURI(path ?? '/'))
            );
            break;
        }
        case 'app':
            await interaction.reply(
                'https://play.google.com/store/apps/details?id=gg.randomdice.twa'
            );
            break;
        case 'invite':
            await interaction.reply(
                `You can click this link to invite ${(
                    interaction.client.user as ClientUser
                ).toString()} to your own server.\nhttps://discord.com/oauth2/authorize?client_id=${
                    client.user?.id
                }&permissions=355393&scope=bot`
            );
            break;
        case 'support':
            await interaction.reply({
                embeds: [
                    getBrandingEmbed()
                        .setTitle('Support Us')
                        .setDescription(
                            'You can support randomdice.gg by funding in patreon or contributing on github.'
                        ),
                ],
                components: [
                    new MessageActionRow().addComponents([
                        new MessageButton()
                            .setStyle('LINK')
                            .setLabel('Patreon')
                            .setURL(
                                'https://www.patreon.com/RandomDiceCommunityWebsite'
                            ),
                        new MessageButton()
                            .setStyle('LINK')
                            .setLabel('GitHub')
                            .setURL('https://github.randomdice.gg'),
                    ]),
                ],
            });
            break;
        default:
    }
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'website',
        description: 'Sends the website link',
        options: [
            {
                name: 'path',
                description: 'The path to the page starting with a /',
                type: 3,
            },
        ],
    },
    {
        name: 'app',
        description: 'Sends the app link',
    },
    {
        name: 'invite',
        description: 'Sends the invite link to the community discord',
    },
    {
        name: 'support',
        description: 'Sends the patreon link to fund this bot and support us',
    },
];
