/* eslint-disable no-console */
import * as admin from 'firebase-admin';
import * as Discord from 'discord.js';
import * as post from '../commands/postNow';

export default function listener(
    client: Discord.Client,
    database: admin.database.Database
): void {
    const posting = {
        guide: false,
        news: false,
    };
    const guild = client.guilds.cache.get(process.env.DEV_SERVER_ID || '');
    database.ref('/decks_guide').on('child_changed', async () => {
        if (!posting.guide) {
            posting.guide = true;
            try {
                await post.postGuide(client, database, guild);
            } catch (err) {
                try {
                    // eslint-disable-next-line no-unused-expressions
                    (
                        (client.channels.cache.get(
                            process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
                        ) as Discord.TextChannel) || undefined
                    )?.send(
                        `Error encountered when posting guide: ${err.message}`
                    );
                } catch (criticalError) {
                    console.error(criticalError);
                }
            } finally {
                posting.guide = false;
            }
        }
    });
    database.ref('/news').on('child_changed', async snapshot => {
        console.log(snapshot.key);
        if (snapshot.key !== 'game') {
            return;
        }
        if (!posting.news) {
            posting.news = true;
            try {
                await post.postNews(client, database, guild);
            } catch (err) {
                try {
                    // eslint-disable-next-line no-unused-expressions
                    (
                        (client.channels.cache.get(
                            process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
                        ) as Discord.TextChannel) || undefined
                    )?.send(
                        `Error encountered when posting news: ${err.message}`
                    );
                } catch (criticalError) {
                    console.error(criticalError);
                }
            } finally {
                posting.news = false;
            }
        }
    });
}
