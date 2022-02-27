/* eslint-disable no-console */
import firebase from 'firebase-admin';
import { database } from 'firebase';
import Discord from 'discord.js';
import logMessage from 'dev-commands/logMessage';
import * as post from '../commands/postNow';

export default function listener(client: Discord.Client): void {
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
        process.env.NODE_ENV === 'development' && client.user
            ? guild?.members.cache.get(client.user.id)
            : undefined;
    const postGuideListener = async (
        snapshot: firebase.database.DataSnapshot,
        event: 'added' | 'updated' | 'removed'
    ): Promise<void> => {
        if (!posting.guide) {
            posting.guide = true;
            try {
                await post.postGuide(client, member, {
                    snapshot,
                    event,
                });
            } catch (err) {
                try {
                    // eslint-disable-next-line no-unused-expressions
                    logMessage(
                        client,
                        `Error encountered when posting guide: ${
                            (err as Error).stack
                        }`
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
                await post.postNews(client, guild);
            } catch (err) {
                try {
                    // eslint-disable-next-line no-unused-expressions
                    logMessage(
                        client,
                        `Error encountered when posting news: ${
                            (err as Error).stack
                        }`
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
