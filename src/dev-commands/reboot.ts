import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import axios from 'axios';

export default async function reboot(
    interaction: CommandInteraction | void
): Promise<void> {
    const { HEROKU_APP_ID, HEROKU_AUTH_TOKEN } = process.env;
    if (
        interaction &&
        interaction?.options.getString('env', true) !== process.env.NODE_ENV
    )
        return;
    if (process.env.NODE_ENV !== 'production') {
        process.exit(0);
    }
    if (interaction && (!HEROKU_APP_ID || !HEROKU_AUTH_TOKEN)) {
        await interaction.reply(
            `Error: Unable to command reboot Missing${
                HEROKU_APP_ID ? '' : ' `HEROKU_APP_ID`'
            } ${
                HEROKU_AUTH_TOKEN ? '' : ' `HEROKU_APP_ID`'
            } from environment variables.`
        );
        return;
    }
    if (interaction) await interaction.reply('Rebooting this instance...');
    await axios.delete(`https://api.heroku.com/apps/${HEROKU_APP_ID}/dynos`, {
        headers: {
            Accept: 'application/vnd.heroku+json; version=3',
            Authorization: `Bearer ${HEROKU_AUTH_TOKEN}`,
        },
    });
}

export const commandData: ApplicationCommandData = {
    name: 'reboot',
    description: 'Reboot this instance.',
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
