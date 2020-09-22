import * as admin from 'firebase-admin';
import * as Discord from 'discord.js';
import * as post from './postNow';

export default function listener(
    client: Discord.Client,
    database: admin.database.Database
) {
    const lastExecuted = {
        guide: new Date(),
    };
    database.ref('/decks_guide').on('child_changed', async () => {
        const currentTime = new Date();
        if (currentTime.valueOf() - lastExecuted.guide.valueOf() > 15000) {
            lastExecuted.guide = new Date();
            try {
                await post.postGuide(client, database);
            } catch (err) {
                throw err;
            }
        }
    });
}
