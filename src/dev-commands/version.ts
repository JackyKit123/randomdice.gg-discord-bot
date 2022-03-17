import { isDev } from 'config/env';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';

export default async function version(
    interaction: CommandInteraction
): Promise<void> {
    if (interaction.options.getString('env', true) !== process.env.NODE_ENV)
        return;

    await interaction.reply(
        `Hi! I am version **\`${
            isDev ? 'development' : process.env.HEROKU_RELEASE_VERSION
        }\`** of ${interaction.client.user?.toString()}.`
    );
}

export const commandData: ApplicationCommandData = {
    name: 'version',
    description: 'Get the version of this bot.',
    options: [
        {
            name: 'env',
            description:
                'which environment of the bot should that respond from.',
            type: 'STRING',
            required: true,
            choices: [
                {
                    name: 'production',
                    value: 'production',
                },
                {
                    name: 'development',
                    value: 'development',
                },
            ],
        },
    ],
};
