import firebase from 'firebase-admin';
import { database } from 'register/firebase';
import { Client } from 'discord.js';
import logMessage from 'util/logMessage';
import { isDev } from 'config/env';
import { getDevTestDiscord } from 'config/guild';
import { postGuide, postNews } from './postNow';

export default function databaseListener(client: Client<true>): void {
    const posting = {
        guide: false,
        news: false,
    };
    const init = {
        guide: true,
        news: true,
    };
    const guild = (isDev && getDevTestDiscord(client)) || undefined;
    const member = guild?.members.cache.get(client.user.id);
    const postGuideListener = async (
        snapshot: firebase.database.DataSnapshot,
        event: 'added' | 'updated' | 'removed'
    ): Promise<void> => {
        if (!posting.guide) {
            posting.guide = true;
            try {
                await postGuide(client, member, {
                    snapshot,
                    event,
                });
            } catch (err) {
                await logMessage(
                    client,
                    'warning',
                    `Error encountered when posting guide: ${
                        (err as Error).stack
                    }`
                );
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
                await postNews(client, guild);
            } catch (err) {
                await logMessage(
                    client,
                    'warning',
                    `Error encountered when posting news: ${
                        (err as Error).stack
                    }`
                );
            } finally {
                posting.news = false;
            }
        }
    });
}
