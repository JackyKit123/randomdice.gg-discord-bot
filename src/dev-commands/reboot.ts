import * as Discord from 'discord.js';
import axios from 'axios';

export default async function reboot(message: Discord.Message): Promise<void> {
    const { HEROKU_APP_ID, HEROKU_AUTH_TOKEN } = process.env;
    if (process.env.NODE_ENV !== 'production') {
        process.exit(0);
    }
    if (!HEROKU_APP_ID || !HEROKU_AUTH_TOKEN) {
        await message.channel.send(
            `Error: Unable to command reboot Missing${
                HEROKU_APP_ID ? '' : ' `HEROKU_APP_ID`'
            } ${
                HEROKU_AUTH_TOKEN ? '' : ' `HEROKU_APP_ID`'
            } from environment variables.`
        );
        return;
    }
    await message.channel.send('Rebooting this instance...');
    await axios.delete(`https://api.heroku.com/apps/${HEROKU_APP_ID}/dynos`, {
        headers: {
            Accept: 'application/vnd.heroku+json; version=3',
            Authorization: `Bearer ${HEROKU_AUTH_TOKEN}`,
        },
    });
}
