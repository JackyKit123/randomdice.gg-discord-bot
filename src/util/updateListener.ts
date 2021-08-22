/* eslint-disable no-console */
import firebase from 'firebase-admin';
import Discord from 'discord.js';
import * as post from '../commands/postNow';

export default function listener(
    client: Discord.Client,
    database: firebase.database.Database
): void {
    const posting = {
        guide: false,
        news: false,
    };
    const init = {
        guide: true,
        news: true,
    };
    const guild = client.guilds.cache.get(process.env.DEV_SERVER_ID || '');
    const member =
        process.env.NODE_ENV === 'development'
            ? guild?.members.cache.get((client.user as Discord.ClientUser).id)
            : undefined;
    const postGuideListener = async (
        snapshot: firebase.database.DataSnapshot,
        event: 'added' | 'updated' | 'removed'
    ): Promise<void> => {
        if (!posting.guide) {
            posting.guide = true;
            try {
                await post.postGuide(client, database, member, {
                    snapshot,
                    event,
                });
            } catch (err) {
                try {
                    // eslint-disable-next-line no-unused-expressions
                    (
                        (client.channels.cache.get(
                            process.env.DEV_SERVER_LOG_CHANNEL_ID || ''
                        ) as Discord.TextChannel) || undefined
                    )?.send(
                        `Error encountered when posting guide: ${err.stack}`
                    );
                } catch (criticalError) {
                    console.error(criticalError);
                }
            } finally {
                posting.guide = false;
            }
        }
    };
    database.ref('/decks_guide').on('child_changed', async snapshot => {
        postGuideListener(snapshot, 'updated');
    });
    database.ref('/decks_guide').on('child_added', async snapshot => {
        if (init) {
            init.guide = false;
            return;
        }
        postGuideListener(snapshot, 'added');
    });
    database.ref('/decks_guide').on('child_removed', async snapshot => {
        postGuideListener(snapshot, 'removed');
    });
    database.ref('/news').on('child_changed', async snapshot => {
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
                        `Error encountered when posting news: ${err.stack}`
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
